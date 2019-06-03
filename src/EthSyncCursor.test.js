import Cursor from './EthSyncCursor';
import _ from 'lodash';
import Snapper from './MockSnapper';

import {
  buildBlocks
} from './test-utils';

import MockWeb3 from './MockWeb3';


describe("EthSyncCursor", ()=>{
  it("Should get all events without snapshots", done=>{
    let blocks = buildBlocks(1001, 1);

    let web3 = new MockWeb3({blocks});
    let abi = [{type: "function", signature: "0x1234567890", inputs: []}];
    let con = new web3.eth.Contract(abi, "0x123456789", {address: "0x123456789"});

    let totalReceived = 0;
    let txnHandler = (err, txns)=>{
      if(err) {
        throw err;
      }
      txns.forEach(t=>{
        _.keys(t.logEvents).forEach(k=>{
          let a = t.logEvents[k];
          totalReceived += a.length;
        });
      });
    }

    let recursivePaging = cursor => {
      if(cursor) {
        cursor.nextBatch(txnHandler).then(recursivePaging);
      } else if(totalReceived !== blocks.length) {
        done("Total did not match all events: " + totalReceived + " != " + blocks.length);
      } else {
        console.log("Total recieved", totalReceived);
        done();
      }
    }

    let c = new Cursor({
      fromBlock: 0,
      toBlock: 3000,
      contract: con,
      web3
    });
    c.init(txnHandler).then(recursivePaging);
  });

  it("Should get all events with snapshots", done=>{
    let blocks = buildBlocks(1001, 1);
    let bootstrapped = blocks.slice(0,300);

    let snapper = new Snapper({
      blocks: bootstrapped
    });

    let web3 = new MockWeb3({blocks});
    let abi = [{type: "function", signature: "0x1234567890", inputs: []}];
    let con = new web3.eth.Contract(abi, "0x123456789", {address: "0x123456789"});

    let totalReceived = 0;
    let txnHandler = (err, txns)=>{
      if(err) {
        throw err;
      }
      txns.forEach(t=>{
        _.keys(t.logEvents).forEach(k=>{
          let a = t.logEvents[k];
          totalReceived += a.length;
        });
      });
    }

    let recursivePaging = cursor => {
      if(cursor) {
        cursor.nextBatch(txnHandler).then(recursivePaging);
      } else if(totalReceived !== blocks.length) {
        done("Total did not match all events: " + totalReceived + " != " + blocks.length);
      } else {
        console.log("Total recieved", totalReceived);
        done();
      }
    }

    let c = new Cursor({
      fromBlock: 0,
      toBlock: 3000,
      contract: con,
      web3,
      snapshotProvider: snapper
    });
    c.init(txnHandler).then(recursivePaging);
    snapper.pushEvents();
  });
})
