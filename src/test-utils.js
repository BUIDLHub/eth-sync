export const buildEvents = (count, blockNumber) => {
  let events = [];
  for(let i=0;i<count;++i) {
    events.push({
      blockNumber: blockNumber||i,
      transactionHash: `${blockNumber+'_'+i}`,
      transactionIndex: i,
      event: "FakeEvent",
      returnValues: {
        field1: "value" + i
      }
    });
  }
  return events;
}

export const buildBlocks = (count, txnsPerBlock) => {
  let blocks = [];
  for(let i=0;i<count;++i) {
    let events = buildEvents(txnsPerBlock, i);

    let b = {
      number: i,
      transactions: events.map(e=>{
        let txn = {
          transactionHash: e.transactionHash,
          transactionIndex: e.transactionIndex,
          logEvents: events.reduce((o,evt)=>{
            o[evt.name] = [evt];
            return o;
          }, {})
        };
        return txn;
      })
    };
    blocks.push(b);
  }
  return blocks;
}
