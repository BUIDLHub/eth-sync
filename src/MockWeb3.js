import Logger from './Logger';
import _ from 'lodash';

const log = new Logger({component: "MockWeb3"});

export default class MockWeb3 {
  constructor(props) {
    this.eth = new MockEth(props);
  }
}

class MockContract {
  constructor(props) {
    this._eth = props.eth;
    [
      'getPastEvents'
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  async getPastEvents(name, options) {
    log.debug("Getting past events between", options.fromBlock, options.toBlock);

    let start = options.fromBlock;
    let end = options.toBlock;
    if(start > end) {
      return [];
    }
    let all = [];

    for(let i=start;i<=end;++i) {
      let block = this._eth.blocks[i];
      if(block) {
        block.transactions.forEach(t=>{
          _.keys(t.logEvents).forEach(k=>{
            let a = t.logEvents[k];
            all = [
              ...all,
              ...a
            ];
            //log.debug("Accumulated", all.length, "txns so far...");
          });

          if(all.length > 1000) {
            throw new Error("more than 1000 results");
          }
        });
      }
    }
    return all;
  }

}


class MockEth {
  constructor(props={}) {
    this.Contract = (abi, address, options = {}) => {
      return new MockContract({abi, address, options, eth: this})
    };

    this.blocks = props.blocks;

    [
      'subscribe',
      'getBlockNumber',
      'getBlock',
      '_addBlock'
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  subscribe(evtName) {
    throw new Error("Subscriptions not supported");
  }

  async getBlockNumber() {
    return this.block;
  }

  async getBlock(num) {
    return this.blocks[num];
  }

  _addBlock(b) {
    this.blocks[b.number] = b;
    this.block = b.number;
  }
}
