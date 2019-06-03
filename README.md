# eth-sync
Utility for retrieving contract log events with optional Snapshot and Storage providers.

## Background
LogEvents are the most common way to track smart contract state/activity in Ethereum. Using Web3's "getPastEvents" function, apps are able to get all events within a block range. Most apps are using Infura's latest log event indexing mechanism to quickly retrieve their events and initialize their apps. In most cases, this information is then stored locally in the browser's localStorage or using an indexDB solution such as LocalForage or PouchDB. 

Naturally, Infura needs to protect itself against memory and bandwidth overload so it imposes a 1K limit on event retrieval. This means that large block ranges or high-volume apps will likely need to write robust, iterative/recursive code to properly handle these overruns. In addition, Web3's 'getPastEvents' only returns log events with minimal context about how those events were generated. So, for example, if you wanted to know the function call associated with the log event, or the value sent along with the original transaction, you will need to make additional RPC calls to Infura to get all the information you need. This is particularly concerning for new app visitors since they must first sync up to some window of past transaction data before they can see the current state of the application. 

<b><em>eth-sync</em></b> helps in this scenario in that it handles all the complex retry logic to ultimately get all the log events. By default, it groups all log events by transaction hash, allowing you to know which events were generated together. All this data can optionally be stored locally using a Storage provider (see BUIDLHub's eth-sync-local project for an example). Optionally, eth-sync will also retrieve transaction metadata as well as block timestamps. Note that including either of these pieces of information will dramatically slow down initialization, unless you use a snapshotting solution.

## Snapshots 
Snapshots are a common middleware technique that builds up a running window of cached information in order to speed up initialization. Once the app is bootstrapped with a historical snapshot, the most recent data is retrieved with a much smaller query.

<b><em>eth-sync</em></b> will accept a Snapshot provider that has a "getLatest" asynchronous function to retrieve a snapshot of transaction data appropriate for the app. The format of the returned snapshot must be a newline-delimited file where each line contains a JSON object representing a transaction. The format of the transaction should be similar to what eth-sync provides, which is as follows:

<pre>
{
  transactionHash: _hash_,
  blockNumber: _block_,
  transactionIndex: _index_,
  logEvents: {
     <event-name>: [matching events array]
  },
  ...remaining txn metadata mostly matching what web3's getTransactionReceipt returns
}
</pre>

BUIDLHub offers a snapshotting service that will generate and make public snapshots of fully decoded transaction data for your app. See BUIDLHub's eth-sync-snapshot project for an example of how you might use your own snapshotting solution.
