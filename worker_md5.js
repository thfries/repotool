importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

var md5 = CryptoJS.algo.MD5.create();

onmessage = function(e) {
  if (e.data.isFinish) {
    postMessage({isProgress: false, result: md5.finalize().toString()});
    close();
  } else {
    md5.update(CryptoJS.enc.Latin1.parse(e.data.chunk));
    postMessage({isProgress: true, progress: e.data.progress});
  }
}
