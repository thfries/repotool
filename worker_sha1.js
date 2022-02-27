importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

var sha1 = CryptoJS.algo.SHA1.create();

onmessage = function(e) {
  if (e.data.isFinish) {
    postMessage({isProgress: false, result: sha1.finalize().toString()});
    close();
  } else {
    sha1.update(CryptoJS.enc.Latin1.parse(e.data.chunk));
    postMessage({isProgress: true, progress: e.data.progress});
  }
}
