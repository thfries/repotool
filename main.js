var template = {
  "fileName": "{{fileName}}",
  "fileSize": "{{fileSize}}",
  "md5": "{{md5}}",
  "sha1": "{{sha1}}",
  "sha256": "{{sha256}}"
};
var fields = {};
var fieldsEditor;
var templateEditor;

window.onload = function() {
  readCookie();
  
  fieldsEditor = ace.edit("fieldsEditor");
  fieldsEditor.session.setMode("ace/mode/json");
  fieldsEditor.on('blur', handleChange);
  templateEditor = ace.edit("templateEditor");
  templateEditor.session.setMode("ace/mode/json");
  templateEditor.on('blur', handleChange);
  
  templateEditor.setValue(JSON.stringify(template, null, 2));
  fieldsEditor.setValue(JSON.stringify(fields, null, 2));
};

var md5;
var sha1;
var sha256;

function handleFileSelect(evt) {
  var file = evt.target.files[0];
  fields = {};
  fields.fileName = file.name;
  fields.fileSize = file.size;
  fieldsEditor.setValue(JSON.stringify(fields, null, 2));

  updateProgressBar(0, 'progress-load');
  updateProgressBar(0, 'progress-md5');
  updateProgressBar(0, 'progress-sha1');
  updateProgressBar(0, 'progress-sha256');
  
  md5 = new Worker('worker_md5.js');
  md5.onmessage = onWorkerResult('md5');
  sha1 = new Worker('worker_sha1.js');
  sha1.onmessage = onWorkerResult('sha1');
  sha256 = new Worker('worker_sha256.js');
  sha256.onmessage = onWorkerResult('sha256');
  
  readChunked(file);
};

function readChunked(file) {
  var fileSize   = file.size;
  var chunkSize  = 16 * 1024 * 1024;
  var offset     = 0;
  
  var reader = new FileReader();
  reader.onload = function() {
    if (reader.error) {
      console.log(reader.error);
      return;
    }
    offset += reader.result.length;
    handleLoadedChunk(reader.result, offset, fileSize); 
    if (offset >= fileSize) {
      md5.postMessage({isFinish: true});
      sha1.postMessage({isFinish: true});
      sha256.postMessage({isFinish: true});
      handleChange();
      return;
    }
    readNext();
  };
  
  reader.onerror = function(err) {
    endCallback(err || {});
  };
  
  function readNext() {
    var fileSlice = file.slice(offset, offset + chunkSize);
    reader.readAsBinaryString(fileSlice);
  }
  readNext();
}  

function handleLoadedChunk(chunk, offset, fileSize) {
  var progress = Math.round(offset/fileSize*100);
  md5.postMessage({isfinish: false, chunk: chunk, progress: progress});
  sha1.postMessage({isfinish: false, chunk: chunk, progress: progress});
  sha256.postMessage({isfinish: false, chunk: chunk, progress: progress});

  updateProgressBar(progress, 'progress-load');
}

function updateProgressBar(percent, progressBarId) {
  var bar = document.getElementById(progressBarId);
  bar.style.width = percent + '%';
  bar.innerHTML = percent + '%';
}

function handleChange() {
  fields = JSON.parse(fieldsEditor.getValue());
  template = JSON.parse(templateEditor.getValue()); 
  document.getElementById("result").value = Mustache.render(JSON.stringify(template, null, 2), fields);
  writeCookie();
}

function onWorkerResult(key) {
  return function(result) {
    if (result.data.isProgress) {
      updateProgressBar(result.data.progress, 'progress-' + key);
    } else {
      fields[key] = result.data.result;
      fieldsEditor.setValue(JSON.stringify(fields, null, 2));
      handleChange();
    }
  }
}

function writeCookie() {
  const d = new Date();
  d.setTime(d.getTime() + 30*24*60*60*1000);
  document.cookie = 'repotool-template=' + window.btoa(JSON.stringify(template)) + ';expires=' + d.toUTCString();
}

function readCookie() {
  const envcookie = document.cookie.split(';')[0].split('=')[1];
  if (envcookie) {
    template = JSON.parse(window.atob(envcookie));
  }        
}
