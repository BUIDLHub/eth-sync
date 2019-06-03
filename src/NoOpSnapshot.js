import stream from 'stream';

/**
 * A fill-in no-op snapshot provider that does nothing but implements
 * the correct interface for snapshot bootstrapping an app.
 */

export default class NoOpSnapshot {
 constructor(props) {
   [
     'getLatest'
   ].forEach(fn=>this[fn]=this[fn].bind(this));
 }

 async getLatest() {
   let pass = stream.passThrough();
   pass.end(null);
   return pass;
 }
}
