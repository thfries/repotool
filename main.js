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

  updateProgressBar(0);
  md5 = CryptoJS.algo.MD5.create();
  sha1 = CryptoJS.algo.SHA1.create();
  sha256 = CryptoJS.algo.SHA256.create();
  
  readChunked(file);
};

function readChunked(file) {
  var fileSize   = file.size;
  var chunkSize  = 4 * 1024 * 1024; // 4MB
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
  md5.update(CryptoJS.enc.Latin1.parse(chunk));
  sha1.update(CryptoJS.enc.Latin1.parse(chunk));
  sha256.update(CryptoJS.enc.Latin1.parse(chunk));
  updateProgressBar(Math.round(offset/fileSize*100));
}

function updateProgressBar(percent) {
  var bar = document.querySelector('.progress-bar');
  bar.style.width = percent + '%';
  bar.innerHTML = percent + '%';

}

function handleChange() {
  fields = JSON.parse(fieldsEditor.getValue());
  fields.md5 = md5.finalize().toString();
  fields.sha1 = sha1.finalize().toString();
  fields.sha256 = sha256.finalize().toString();
  fieldsEditor.setValue(JSON.stringify(fields, null, 2));
  template = JSON.parse(templateEditor.getValue()); 
  document.getElementById("result").value = Mustache.render(JSON.stringify(template, null, 2), fields);
  writeCookie();
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
