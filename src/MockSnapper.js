import stream from 'stream';
import _ from 'lodash';

const byBlockAndHash = events => {
  let byBlock = {};
  events.forEach(e=>{
    let byHash = byBlock[e.blockNumber] || {};
    let logEvents = byHash[e.transactionHash] || {};
    let set = logEvents[e.event] || [];
    set.push(e);
    logEvents[e.event] = set;
    byHash[e.transactionHash] = logEvents;
    byBlock[e.blockNumber] = byHash;
  });
  return byBlock;
}

export default class MockSnapper {
  constructor(props) {
    this.pass = stream.PassThrough();
    this.data = "";

    if(props.events) {
      let byBlock = byBlockAndHash(props.events);
      let blocks = _.keys(byBlock);
      blocks.sort((a,b)=>(a-0)-(b-0));

      //have to convert blocks into what cursor expects
      blocks = blocks.map(b=>{
        let txns = [];
        let byHash = byBlock[b];
        _.keys(byHash).forEach(h=>{
          let logEvents = byHash[h];
          //this is low level events organized by hash
          let txn = {
            transactionHash: h,
            transactionIndex: 0,
            blockNumber: b,
            logEvents
          };
          txns.push(txn);
        });
        return {
          number: b,
          transactions: txns
        }
      });

      blocks.forEach(b=>{
        this.data += JSON.stringify(b) + "\n";
      });
    } else if(props.blocks) {
      props.blocks.forEach(b=>{
        this.data += JSON.stringify(b) + "\n";
      })
    }

    [
      'getLatest',
      'pushEvents'
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  async getLatest() {
    return this.pass;
  }

  pushEvents() {
    return new Promise((done,err)=>{
      setTimeout(()=>{
        this.pass.end(this.data);
        done();
      },500);
    });
  }
}
