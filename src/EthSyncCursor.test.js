import Cursor from './EthSyncCursor';
import _ from 'lodash';
import Snapper from './MockSnapper';
import {FetchStream} from 'fetch';
import stream from 'stream';
import Web3 from 'web3';
import axios from 'axios';

import {
  buildBlocks
} from './test-utils';

import MockWeb3 from './MockWeb3';

const BASE_ABI_URL = "https://api.etherscan.io/api?module=contract&action=getabi&address=";
const CONTRACT = "0x06012c8cf97bead5deae237070f9587f8e7a266d";
const NETWORK = 'mainnet';
const RPC_ENDPOINT = `wss://${NETWORK}.infura.io/ws`;

const fetchABI = async () => {
  let abiUrl = BASE_ABI_URL + CONTRACT;

  let r = await axios.get(abiUrl);
  let res = _.get(r, "data.result");
  if (!res) {
    throw new Error(`unable to fetch ABI from ${abiUrl}`);
  }

  let abi = res;
  if (typeof abi === 'string') {
    abi = JSON.parse(res);
  }

  if (!abi.length) {
    throw new Error(`unable to parse ABI: ${res}`);
  }

  return abi;
}


describe("EthSyncCursor", ()=>{

  /*
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
  */
 /*
  it("Should pull events from web3", done=>{
    let web3 = new Web3(RPC_ENDPOINT)
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
    
    fetchABI()
    .then(abi=>{
      
      let con = new web3.eth.Contract(abi, CONTRACT, {address: CONTRACT});
      let c = new Cursor({
        fromBlock: 8054296,
        toBlock: 8074296,
        contract: con,
        web3
      });
      return c.init(txnHandler).then(recursivePaging);
    }).then(()=>console.log("Should be done"));
  }).timeout(25000)
  */

  /*
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
  */

  /*
  it("should pull using BUIDLHub snapshot", done=>{
    let fromBlock = 8024408;
    let snapLastBlock = 0;
    let toBlock = 8074408;
    let snapper = new BHubSnapper();
    let totalReceived = 0;
    let lastBlock = 0;
    let txnHandler = (err, txns)=>{
      if(err) {
        throw err;
      }
      txns.forEach(t=>{
        if(t.blockNumber > lastBlock) {
          lastBlock = t.blockNumber;
        }

        _.keys(t.logEvents).forEach(k=>{
          let a = t.logEvents[k];
          totalReceived += a.length;
        });
      });
    }

    let recursivePaging = async cursor => {
      if(cursor) {
        console.log("Getting next batch");
        cursor.nextBatch(txnHandler).then(recursivePaging);
      } else {
        if(lastBlock <= snapLastBlock) {
          return done(new Error("Last block is not the final block: " + lastBlock + " < " + snapLasstBlock));
        }
        console.log("Total txns recieved", totalReceived, "last block", lastBlock);
        done();
      }
    }

    let web3 = new Web3(RPC_ENDPOINT);

    fetchABI()
    .then(abi=>{
      let con = new web3.eth.Contract(abi, CONTRACT, {address: CONTRACT});
      let c = new Cursor({
        fromBlock,
        toBlock,
        contract: con,
        web3,
        snapshotProvider: snapper
      });
      return c.init(txnHandler).then(recursivePaging);
    }).then(()=>console.log("Should be done"));
  }).timeout(20000);

  */
 
});


const SNAP_URL = "https://buidlhub-snapshots.s3.amazonaws.com/snap_9NlPQmsBUKbb9uKfcoy2";
class BHubSnapper {
  constructor(props) {
    [
      'getLatest'
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  getLatest() {
    return new Promise((done)=>{
      let fetch = new FetchStream(SNAP_URL, {mode: 'cors'});
      let s = stream.PassThrough();
      fetch.pipe(s);
      done(s);
    });
  }
}

