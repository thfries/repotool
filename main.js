var template = {
  "fileName": "{{fileName}}",
  "fileSize": "{{fileSize}}",
  "md5": "{{md5}}",
  "sha1": "{{sha1}}",
  "sha256": "{{sha256}}",
  "version": "{{version}}",
  "field1": "{{field1}}",
  "field2": "{{field2}}",
};

var configuration = {
  'Configuration 1': {
    'field1': 'value1.1',
    'field2': 'value1.2'
  },
  'Configuration 2': {
    'field1': 'value2.1',
    'field2': 'value2.2'
  }
}

var fields = {};
var configurationEditor;
var templateEditor;

window.onload = function() {
  readCookie();
  
  configurationEditor = ace.edit("configurationEditor");
  configurationEditor.session.setMode("ace/mode/json");
  configurationEditor.on('blur', loadConfiguration);
  configurationEditor.setValue(JSON.stringify(configuration, null, 2));

  templateEditor = ace.edit("templateEditor");
  templateEditor.session.setMode("ace/mode/json");
  templateEditor.on('blur', handleChange);
  templateEditor.setValue(JSON.stringify(template, null, 2));

  loadConfiguration();
};

var md5;
var sha1;
var sha256;

function handleFileSelect(evt) {
  var file = evt.target.files[0];
  fields.fileName = file.name;
  fields.fileSize = file.size;
  fields.version = file.name.replace(/^[^\d]*/gim, '');
  fields.version = fields.version.replace(/[^\d]*(\.[^\.]*)?$/gim, '');
  document.getElementById('version').value = fields.version;

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
  var chunkSize  = Math.min(fileSize, 16 * 1024 * 1024);
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
  fields.version = document.getElementById('version').value;
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
  document.cookie.split(';').forEach((value, i) => {
    const cookie = value.trim().split('=');
    if (cookie[0] === 'repotool-template2') {
      template = JSON.parse(window.atob(cookie[1]));
    }
  });
}

function setPackageFields(evt) {
  fields.packageName = evt.target.value;
  Object.keys(configuration[fields.packageName]).forEach((field, i) => {
    fields[field] = configuration[evt.target.value][field];
  })
  handleChange();
}

function loadConfiguration() {
  configuration = JSON.parse(configurationEditor.getValue());
  var html = '<option selected>Select package</option>';
  Object.keys(configuration).forEach((packageName, i) => {
    html += `<option value="${packageName}">${packageName}</option>`
  })
  document.getElementById('packageName').innerHTML = html;
}