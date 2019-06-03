import EthSync from './';
import Snapper from './MockSnapper';
import {
  buildBlocks
} from './test-utils';
import MockWeb3 from './MockWeb3';
import _ from 'lodash';


describe("EthSyncOnly", ()=>{
  it("Should get all events without snapshots", done=>{
    let blocks = buildBlocks(2001, 1);

    let web3Factory = () => new MockWeb3({blocks});

    let sync = new EthSync({
      abi: [{
        type: "function",
        sigature: "0x1234567890",
        inputs: []
      }],
      address: "0x123456789",
      web3Factory: web3Factory
    });

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

    sync.start({
      fromBlock: 0,
      toBlock: 3000
    }, txnHandler)
    .then(recursivePaging);
  });

  it("Should get all events", done=>{
    let blocks = buildBlocks(2001, 1);
    let bootstrapped = blocks.slice(0,300);

    let snapper = new Snapper({
      blocks: bootstrapped
    });

    let web3Factory = () => new MockWeb3({blocks});

    let sync = new EthSync({
      abi: [{
        type: "function",
        sigature: "0x1234567890",
        inputs: []
      }],
      address: "0x123456789",
      web3Factory: web3Factory,
      snapshotProvider: snapper
    });

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

    sync.start({
      fromBlock: 0,
      toBlock: 3000
    }, txnHandler)
    .then(recursivePaging);
    snapper.pushEvents();
  });
});
