import Logger from './Logger';
import _ from 'lodash';
import * as yup from 'yup';
import stream from 'stream';
import uuid from 'uuid/v4';

const log = new Logger({component: "EthSyncCursor"});

const MIN_BLOCK_RANGE = 100;
const DEFAULT_DELIMETER = "\n";

const schema = yup.object().shape({
  fromBlock: yup.number().required("Sync cursor missing fromBlock"),
  toBlock: yup.number().min(1).required("Sync cursor missing toBlock"),
  contract: yup.object().required("Sync cursor missing contract to query against"),
  web3: yup.object().required("Sync cursor is missing web3 instance"),
  eventName: yup.string(), //not required
  options: yup.object() //not required
})

const TOO_MANY = /more than \d+ results/;

/**
 * Cursor holds current offset of blocks to retrieve in an iterative way. This
 * allows client code to have control over when to grab next batch of data.
 */
export default class EthSyncCursor {

  constructor(props) {
    schema.validateSync(props);

    //starting block
    this.fromBlock = props.fromBlock;

    //interim end block. This may be different than final end block
    //if block range results in > 1k events
    this.toBlock = props.toBlock;

    //the actual range end block
    this.finalEnd = props.toBlock;

    //web3 instance in case we need to query additional metadata
    this.web3 = props.web3;

    //number of blocks to add when computing next block iteration
    this.increment = 0;

    //the contract we're querying against
    this.contract = props.contract;

    //specific event name we're looking for
    this.eventName = props.eventName;

    //custom delimiter if data contains newlines
    this.recordDelimeter = props.recordDelimeter || DEFAULT_DELIMETER;

    //whether to retrieve transaction receipts for each txn hash
    this.includeReceipt = props.includeReceipt;

    //any filter options to include in the query
    this.options = props.options;

    //bootstrap the process by providing a cached snapshot of
    //event data
    this.snapshotProvider = props.snapshotProvider;

    //metadata about the retrieval process
    this.meta = {
      rpcCalls: 0,
      fromBlock: 0,
      toBlock: 0
    };

    [
      'init',
      'nextBatch',
      '_pull',
      '_bootstrap',
      '_processSnapshotItems',
      '_getReceipts'
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  /**
   * Initialize the cursor by performing the first query of events.
   * @returns Promise that when complete indicates the query has
   * finished and all events were given through the callback
   */
  init(callback, badCallback) {
    return new Promise((done,err)=>{
      //first, try to bootstrap with a snapshot provider
      if(this.snapshotProvider) {
        this._bootstrap(callback)
        .then(()=>{
          this._pull(done, err, callback, badCallback);
        })
        .catch(e=>err(e));
      } else {
        //just pull in according to block range
        this._pull(done, err, callback, badCallback);
      }
    });
  }

  /*
   * Get the next batch of items.
   * @returns Promise that when complete indicates query has finished.
   */
  nextBatch(callback, badHandler) {
    return new Promise((done,err)=>{
      this._pull(done, err, callback, badHandler);
    })
  }

  _bootstrap(callback, badHandler) {
    return new Promise(async (done,err)=>{
      let s = null;
      try {
        s = await this.snapshotProvider.getLatest();
      } catch (e) {
        return err(e);
      }

      if(!s) {
        return done();
      }

      var data = "";
      var start = Date.now();

      let endHandler = async () => {
        //log.debug("Writable stream ending");
        //end stream
        if(data.length > 0) {
          try {
            //process last bit forcing send since it's last bit of data
            let d = data;
            data = "";
            await this._processSnapshotItems(callback, d, true);
          } catch (e) {
            callback(e);
          }
        }
        log.info("EthSync bootstrapped", this.snapCount, "txns in", (Date.now()-start), "ms with snapshot containing block range", this.snapStart, "-",this.fromBlock-1);
        done();
      }

      let handleData = async (buff, encoding, cb) => {
        //log.debug("Writable getting buff of length", buff.length);
        if(buff) {
          data += buff.toString();
          try {
            data = await this._processSnapshotItems(callback, data);
          } catch (e) {
            let idx = data.indexOf(this.recordDelimeter);
            if(idx > 0) {
              data = data.substring(idx+1); //skip over bad data
            }
            callback(e);
          }
          //log.debug("Requesting next buffer of data...");
          cb();
        } else {
          await endHandler();
        }
      };

      var writeable = new stream.Writable({
        decodeStrings: false,
        write: handleData
      });

      s.pipe(writeable);
      writeable.on("finish", async ()=>{
        await endHandler();
      });
    });
  }

  async _processSnapshotItems(callback, data, last) {
    let idx = data.indexOf(this.recordDelimeter);

    while(idx > 0) {
      let obj = data.substring(0, idx);
      let block = JSON.parse(obj);
      block.number -= 0;
      if(this.meta.fromBlock === 0) {
        this.meta.fromBlock = block.number;
      }
      this.meta.toBlock = block.number;
      //log.debug("Calling callback with new block...");
      await callback(null, block.transactions, {
        ...this.meta
      });
      //log.debug("Callback complete");
      if(block.number && block.number > this.fromBlock) {
        this.fromBlock = block.number+1;
      }
      if(block.number && (!this.snapStart || this.snapStart > block.number)) {
        this.snapStart = block.number;
      }
      if(!this.snapCount) {
        this.snapCount = 0
      }
      this.snapCount += block.transactions.length;

      data = data.substring(idx+1);
      idx = data.indexOf(this.recordDelimeter);
    }

    if(data.length > 0 && last) {
      let block = JSON.parse(data);
      block.number -= 0;
      this.meta.toBlock = block.number;
      await callback(null, block.transactions, {
        ...this.meta
      });
      if(block.number && block.number > this.fromBlock) {
        this.fromBlock = block.number+1;
      }
      data = "";
    }
    return data;
  }

  async _pull(done, err, cb, badCb) {
    let span = this.toBlock - this.fromBlock;

    if(span < 0) {
      log.error("Invalid block range. Start is before end", this.fromBlock, this.toBlock);
      //return err(new Error("Start block is after end block"));
      return done(undefined);
    }

    log.debug("Querying", span, "blocks for logs in range", this.fromBlock, "-", this.toBlock);
    let config = {
      ...this.options,
      fromBlock: this.fromBlock,
      toBlock: this.toBlock
    };

    try {
      let contract = this.contract;

      let evtName = this.eventName || "allEvents";
      let start = Date.now();
      this.meta.rpcCalls++;
      this.meta.fromBlock = this.fromBlock;
      this.meta.toBlock = this.toBlock;

      //attempt to get events
      let events = await contract.getPastEvents(evtName, config);
      
      //always make sure events are sorted by block and txn index
      events.sort((a,b)=>{
        let diff = a.blockNumber - b.blockNumber;
        if(diff) {
          return diff;
        }
        return a.transactionIndex - b.transactionIndex;
      });

      //convert to consistent block structure
      let byBlock = byBlockAndHash(events);

      log.debug("Retrieved", events.length, "events in", (Date.now()-start),"ms");

      try {
        let blocks = _.values(byBlock);
        log.debug("Sending", blocks.length, "blocks to callback");
        let meta = {
          ...this.meta
        };
        //for each block
        for(let i=0;i<blocks.length;++i) {
          let b = blocks[i];

          //retrieve receipts if asked to do so. this will be slow...
          if(this.includeReceipt) {
            await this._getReceipts(b.transactions);
          }

          //send back all transaction bundles
          await cb(null, b.transactions, meta);
          if(typeof badCb === 'function') {
            await badCb(b.badTransactions)
          }
        }
        
        this.meta = {
          rpcCalls: 0
        }
      } catch (e) {
        log.error("Problem in callback", e);
      }

      //if there is more in the entire block range
      log.debug("Final end",this.finalEnd,"Current end",this.toBlock);
      if(this.finalEnd > this.toBlock) {
        let start = this.toBlock + 1;
        if(this.increment < MIN_BLOCK_RANGE) {
          this.increment = MIN_BLOCK_RANGE;
        }
        let end = this.toBlock + 1 + this.increment;

        log.debug("Going to next segement", start, end);
        this.fromBlock = start;
        this.toBlock = Math.min(end, this.finalEnd);
        done(this);
      } else {
        log.debug("Finished all segments");
        //otherwise scan is complete
        done(undefined);
      }
    } catch (e) {


      //yes, hacky, but Infura docs specific have this as what to look
      //for to adjust block range
      if(TOO_MANY.test(e.message)) {

        if(span <= 1) {
          //we've already reduced it as much as we can reduce
          //the span so have to bail out.
          throw e;
        }

        //otherwise, cut the span in 1/2 and try again
        let newSpan = Math.ceil(span/2)-0;

        //if wec can't split any lower than 1, we bail
        if(newSpan === 0) {
          throw e;
        }

        let totalSpan = this.finalBlock - this.fromBlock;

        this.increment = newSpan;
        this.totalPages = Math.ceil(totalSpan / this.increment);
        let oldEnd = this.toBlock;
        this.toBlock = newSpan + this.fromBlock;
        log.warn("Too many events in range", this.fromBlock, "-", oldEnd, "Trying smaller block range of", newSpan, "blocks");
        this._pull(done, err, cb);
      } else {
        log.error("Problem pulling events", e);
        err(e);
      }
    }
  }//end _pull

  async _getReceipts(txns) {
    let web3 = this.web3;
    for(let i=0;i<txns.length;++i) {
      let r = await web3.eth.getTransactionReceipt(txns[i].transactionHash);
      txns[i].receipt = r;
    }
  }
}

class EthBlock {
  constructor(props) {
    this.number = props?props.number:undefined;
    this.timestamp = props?props.timestamp:undefined;

    this._byHash = {};
    this._badTxns = [];
    [
      'addEvent'
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  get transactions() {
    return _.values(this._byHash);
  }

  get badTransactions() {
    return this._badTxns;
  }

  get byHash() {
    return {
      ...this._byHash
    }
  }

  addEvent(evt) {
    let hash = evt.transactionHash;
    if(!hash) {
      log.debug("Invalid event", JSON.stringify(evt, null, 2));
      this._badTxns.push(evt);
      return;
      //throw new Error("Missing transactionHash in event");
    }

    hash = hash.toLowerCase();
    let bundle = this._byHash[hash];
    if(!bundle) {
      bundle = new EventBundle({
        transactionHash: hash,
        transactionIndex: evt.transactionIndex,
        blockNumber: this.number,
        timestamp: this.timestamp
      });
      this._byHash[hash] = bundle;
    }
    bundle.addEvent(evt);
  }
}

class EventBundle {
  constructor(props) {
    this.transactionHash = props.transactionHash;
    this.transactionIndex = props.transactionIndex;
    this.blockNumber = props.blockNumber;
    this.timestamp = props.timestamp;
    this.logEvents = {};
    [
      'addEvent'
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  addEvent(evt) {
    let a = this.logEvents[evt.event] || [];
    a.push(evt);
    a.sort((a,b)=>a.logIndex-b.logIndex);
    this.logEvents[evt.event] = a;
  }
}

const byBlockAndHash = (events) => {
  return events.reduce((o,e)=>{
    let retVals = e.returnValues;
    _.keys(retVals).forEach(k=>{
      let d = retVals[k];
      if(d._ethersType === 'BigNumber') {
        retVals[k] = d.toString();
      }
    });
    let block = o[e.blockNumber] || new EthBlock({
      number: e.blockNumber
    });
    block.addEvent(e);
    o[e.blockNumber] = block;
    return o;
  },{});
}
