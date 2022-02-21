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

function handleFileSelect(evt) {
  var file = evt.target.files[0];
  
  var reader = new FileReader();
  reader.onload = function(loadedEvent) {
    var fileBytes = CryptoJS.enc.Latin1.parse(loadedEvent.target.result);
    fields.md5 = CryptoJS.MD5(fileBytes).toString();
    fields.sha1 = CryptoJS.SHA1(fileBytes).toString();
    fields.sha256 = CryptoJS.SHA256(fileBytes).toString();
    fieldsEditor.setValue(JSON.stringify(fields, null, 2));
    handleChange();
  }
  fields.fileName = file.name;
  fields.fileSize = file.size;
  reader.readAsBinaryString(file);
};

function handleChange() {
  fields = JSON.parse(fieldsEditor.getValue());
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
