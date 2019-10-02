import Cursor from './EthSyncCursor';
import * as yup from 'yup';

const schema = yup.object().shape({
  address: yup.string().required("Sync missing contract address"),
  abi: yup.array().min(1).required("Sync missing ABI array"),
  snapshotProvider: yup.object() //not required
});

export default class EthSync {
  constructor(props) {
    schema.validateSync(props);

    this.web3Factory = props.web3Factory;
    if(typeof this.web3Factory !== 'function') {
      throw new Error("Sync has invalid web3Factory property. Must be a function");
    }
    this.address = props.address;
    this.abi = props.abi;
    this.snapshotProvider = props.snapshotProvider;

    [
      'start'
    ].forEach(fn=>this[fn]=this[fn].bind(this));
  }

  start({
    eventName,
    options,
    fromBlock,
    toBlock
  }, callback, badCallback) {

    let web3 = this.web3Factory();
    let con = new web3.eth.Contract(this.abi, this.address, {address: this.address});
    let c = new Cursor({
      fromBlock: fromBlock,
      toBlock: toBlock,
      eventName: this.eventName,
      web3,
      contract: con,
      options: this.options,
      snapshotProvider: this.snapshotProvider
    });

    return c.init(callback, badCallback);
  }
}
