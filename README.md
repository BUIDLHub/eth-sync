# eth-sync
Utility for retrieving contract log events with optional Snapshot provider.

# Installation
npm i --save eth-sync

# Usage
<pre>
//assume import EthSync from 'eth-sync'
let sync = new EthSync({
   address: <contract_address>,
   abi: <contract_abi>,
   snapshotProvider: <optional_snapshot_provider>
});
let callback = async (e, txns) => {
   //txns contain txn receipt metadata along with a logEvents map. The logEvents map is keyed by the event name 
   //and maps to an array of event objects. Events are identical to what web3 returns for getPastEvents.
}
sync.start({
   fromBlock: <starting_block>,
   toBlock: <ending_block_inclusive>,
   eventName: <optional_event_name>,
   options: <optional_filters_like_web3>
}, callback)
.then(()=>{
   //scan complete. App is now initialized with events from provided block range
})
.catch(e=>{
   //something went wrong in scan.
});
</pre>

## Background
LogEvents are the most common way to track smart contract state/activity in Ethereum. Using Web3's "getPastEvents" function, apps are able to get all events within a block range. Most apps are using Infura's latest log event indexing mechanism to quickly retrieve their events and initialize their apps. In most cases, this information is then stored locally in the browser's localStorage or using an indexDB solution such as LocalForage or PouchDB. 

Naturally, Infura needs to protect itself against memory and bandwidth overload so it imposes a 1K limit on event retrieval. This means that large block ranges or high-volume apps will likely need to write robust, iterative/recursive code to properly handle these overruns. In addition, Web3's 'getPastEvents' only returns log events with minimal context about how those events were generated. So, for example, if you wanted to know the function call associated with the log event, or the value sent along with the original transaction, you will need to make additional RPC calls to Infura to get all the information you need. This is particularly concerning for new app visitors since they must first sync up to some window of past transaction data before they can see the current state of the application. 

<b><em>eth-sync</em></b> helps in this scenario in that it handles all the complex retry logic to ultimately get all the log events. By default, it groups all log events by transaction hash, allowing you to know which events were generated together. Optionally, eth-sync will also retrieve transaction metadata as well as block timestamps. Note that including either of these pieces of information will dramatically slow down initialization, unless you use a snapshotting solution.

## Snapshots 
Snapshots are a common middleware technique that builds up a running window of cached information in order to speed up initialization. Once the app is bootstrapped with a historical snapshot, the most recent data is retrieved with a much smaller query.

<b><em>eth-sync</em></b> will accept a Snapshot provider that has a "getLatest" asynchronous function to retrieve a snapshot of transaction data appropriate for the app. The function should return a stream (see NPM <a href="https://www.npmjs.com/package/stream">stream</a>). The stream content should contain newline-delimited data where each line contains a JSON object representing a block. The block does not have to be a full block, but must at least have the block 'number' and 'transactions' fields. At a minimum, it should look like this:

<pre>
{
  number: 79123456,
  transactions: [
     {
        transactionHash: "0x1234...",
        blockNumber: 79123456,
        transactionIndex: 0,
        logEvents: {
           <event-name>: [matching events array]
        },
        receipt: {
            ...metadata matching what web3's getTransactionReceipt
        }
     },
     ...
  ]
}
</pre>

The JSON objects contained in a snapshot must be sorted in block order, and each transactions array should be sorted by transaction index. Unsorted data will result in unordered event callbacks. Note that the receipt is optional but recommended if your app needs transaction context with event data.

BUIDLHub offers a snapshotting service that will generate and make public snapshots of fully decoded transaction data for your app. See BUIDLHub's eth-sync-snapshot project for an example of how you might use your own snapshotting solution or to use the BUIDLHub service.
