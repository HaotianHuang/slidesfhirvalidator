/**
 *  Description: This script is responsible for validating FHIR objects in Google Slides.
 *  Usage: Configure presentationId to desired presentation then >RUN.
 *  Script: Searches and validates textboxes containing JSON representations of FHIR within your presentation.
 *  Result: Errors are logged in speaker notes.
*/ 

// Constants to be used throughout the script
// Edit presentationId to match desired presentationId. Find it here https://developers.google.com/slides/api/guides/overview
const sourceUrl = 'https://inferno.healthit.gov/validatorapi/validate?';
const presentationId = '1HZNRC-nJhgW-hyvXBgCecmrBHT6oCRCosCBMMO0O9Zg';

class ErrorManager {
    /**
    * Description: The error manager is responsible for logging errors and inserting them into the speaker notes.
    * Args:
        * @param {string} slideId - The id of the slide
        * @param {string} errorDescription - The error description
        * @param {string} errorType - The type of error
    * Returns:
    *   @return {void}
    */

    constructor(){
        this.errorDict = {};
    }

    log(slideId, errorDescription){
        if (!this.errorDict[slideId]){
        this.errorDict[slideId] = [];
        } 
        this.errorDict[slideId].push(errorDescription);
    }

    insertError(currentSlide, slideId, currentErrorDict){
        if (currentErrorDict[slideId] != []){

        let speakerNotes = currentSlide.getNotesPage().getSpeakerNotesShape().getText().asString();
        
        let arr = currentErrorDict[slideId];
        let parts = [];
        for(let i = 0; i < arr.length; i += 1){
            parts.push(arr.slice(i, i + 1).join(' '));
        }
        let errString = parts.join('\n');
        let newNotes = errString.concat("\n -- \n", speakerNotes);

        currentSlide.getNotesPage().getSpeakerNotesShape().getText().setText(newNotes);
        console.log(`❗️ Reported error in notes: ${errString}`);
        }
    }
}

class ObjManager {
    /**
     * Description: The object manager is responsible for finding and storing FHIR objects in Google Slides.
     * Args:
        * @param {string} slideId - The id of the slide
        * @param {string} objDict - The dictionary of objects
        * @param {string} slides - The slides in the presentation
     * Returns:
     *  @return {void}
    */

    constructor(){
      this.objDict = {}
      this.slides = SlidesApp.openById(presentationId).getSlides();
    }

    init(){
        for (var i = 0; i < this.slides.length; i++){
            let slideId = this.slides[i].getObjectId();
            this.objDict[slideId] = [];
            this.loadObjectsBySlide(this.slides[i]);
        }
    }

    loadObjectsBySlide(slide){
        let pageElements = slide.getPageElements();
        for (var i = 0; i < pageElements.length; i++){
            if (pageElements[i].getPageElementType() != "SHAPE"){ continue; }
            let str = pageElements[i].asShape().getText().asString();
            let strArray = this.findObjectsInString(str);
            if (strArray != null) { 
            let slideId = slide.getObjectId();
            this.objDict[slideId] = this.objDict[slideId].concat(strArray);
            }
        }
    }

    findObjectsInString(str) {
        let objectStartIndex = -1;
        let objectEndIndex = -1;
        let currentChar;

        let stack = [];
        let objects = [];

        for (let i = 0; i < str.length; i++) {
            currentChar = str[i];
            if (currentChar === '{') {
                stack.push(i);
            }
            if (currentChar === '}') {
                objectStartIndex = stack.pop();

                if (stack.length === 0) {
                    objectEndIndex = i;
                    objects.push(str.substring(objectStartIndex, objectEndIndex + 1));
                }
            }
        }

        if (objects.length === 0) {
            return null;
        } else {
            return objects;
        }
    }
}

const errormanager = new ErrorManager();
const objmanager = new ObjManager();

async function main(tests = false){
    /**
     * Description: The main function is responsible for orchestrating the initialization of the object manager and error manager and running the validation.
     * Args:
     * @param {boolean} tests - Whether or not to run tests
     * Returns:
     * @return {void}
     */

    if (tests) { testsLive(); }

    objmanager.init();
    for (var i = 0; i < objmanager.slides.length; i++){ 
    let currentSlide = objmanager.slides[i];
    let slideId = objmanager.slides[i].getObjectId();
    var strArray = objmanager.objDict[slideId];
    try{
        if (objmanager.objDict[slideId] != []){
            for (var n = 0; n < strArray.length; n++){
            let response = await validate(slideId, strArray[n]);
            responseToError(response).map((x) => errormanager.log(slideId, x));
            }
        }
    } catch (err){  
    } finally {
        if (errormanager.errorDict[slideId] != [] && errormanager.errorDict[slideId] != null){
        errormanager.insertError(currentSlide, slideId, errormanager.errorDict);
        }
    }
    }
}
 
async function validate(slideId, myObjectString) {
    /**
     * Description: The validate function is responsible for querying the FHIR validation server and returning the response.
     * Args:
     * @param {string} slideId - The id of the current slide
     * @param {string} myObjectString - The stringified object
     * Returns:
     * @return {object} response - The response from the FHIR validation server
    */ 

  try {
    var parsed = JSON.parse(myObjectString);
  } catch (err) {
    errormanager.log(slideId, err.message);
  }

  if (isExistResourceType(parsed)){
    var resourceType = getResourceType(parsed);
  } else {
    errormanager.log(slideId, getResourceType(parsed));

  }

  var response = await query(parsed, resourceType);

  return response;
}

async function query(resource, resourceType){
    /**
     * Description: The query function is responsible for querying the FHIR validation server.
     * Args:
     * @param {object} resource - The resource to be validated
     * @param {string} resourceType - The type of the resource
     * Returns:
     * @return {object} response - The response from the FHIR validation server
    */
  
    var raw = JSON.stringify(resource);

    var requestOptions = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    payload: raw,
    redirect: 'follow',
    };

    var queryUrl = buildURL('profile', 'http://hl7.org/fhir/StructureDefinition/' + resourceType);

    const response = await UrlFetchApp.fetch(queryUrl, requestOptions);

    return response;
}

function isExistResourceType(obj){
    // Check if the resourceType field exists

    if (obj && obj.resourceType != null){
        return true;
    }
        return false;
}

function getResourceType(obj) {
    // Return the resourceType field

    if (obj && obj.resourceType != null){
        return obj.resourceType;
    }
        return 'resourceType field is missing or broken!';
}

function responseToError(response){
    /**
     * Description: The responseToError function is responsible for parsing the response from the FHIR validation server.
     * Args:
     * @param {object} response - The response from the FHIR validation server
     * Returns:
     * @return {array} newErrors - The array of errors
    */

    var responseString = response.toString();
    var response = JSON.parse(responseString);

    var newErrors = [];
    var responseList = response['issue']
    for (var i = 0; i < responseList.length; i++){
        newErrors.push(responseList[i]['severity'].concat(': ', responseList[i]['details']['text']));
    }
    console.log(`⬇️ newErrors parsed from server: ${newErrors}`);
    return newErrors;
}

function buildURL(name, value) {
    /**
     * Description: The buildURL function is responsible for building the URL for the FHIR validation server.
     * Args:
     * @param {string} name - The name of the parameter
     * @param {string} value - The value of the parameter
     * Returns:
     * @return {string} url - The URL for the FHIR validation server
    */ 

    var url = sourceUrl;
    var prefix = url.indexOf('?') === -1 ? '?' : '&';
    return url + prefix + encodeURIComponent(name) + '=' + encodeURIComponent(value);
}

function getParameterByName(name, url) {
    /**
     * Description: The getParameterByName function is responsible for getting the parameter by name from the URL.
     * Args:
     * @param {string} name - The name of the parameter
     * @param {string} url - The URL
     * Returns:
     * @return {string} decodeURIComponent(results[2].replace(/\+/g, ' ')) - The value of the parameter
    */

    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/************************
 * TESTS : OPTIONAL
 ************************/

/**
 * Class for running unit tests
 */

 let UnitTestingApp = (function () {

  const _enabled = new WeakMap();
  const _runningInGas = new WeakMap();

  class UnitTestingApp {
    constructor() {
      if (UnitTestingApp.instance) return UnitTestingApp.instance;
      
      _enabled.set(this, false);
      _runningInGas.set(this, false);
      UnitTestingApp.instance = this;
      
      return UnitTestingApp.instance;
    }

    enable() {
      _enabled.set(this, true);
    }

    disable() {
      _enabled.set(this, false);
    }
    
    get isEnabled() {
      return _enabled.get(this);      
    }

    get isInGas() {
      return typeof ScriptApp !== 'undefined';
    }

    get runningInGas() {
      return _runningInGas.get(this);
    }

    runInGas(bool = true) {
      _runningInGas.set(this, bool);
    }

    clearConsole() {
      if (console.clear) console.clear();
    }

    /**
     * Tests whether conditions pass or not
     * @param {Boolean | Function} condition - The condition to check
     * @param {String} message - the message to display in the console
     * @return {void}
     */
    assert(condition, message) {
      if(!_enabled.get(this)) return;
      if(this.isInGas !== this.runningInGas) return;
      try {
        if ("function" === typeof condition) condition = condition();
        if (condition) console.log(`✔ PASSED: ${message}`);
        else console.log(`❌ FAILED: ${message}`);
      } catch(err) {
        console.log(`❌ FAILED: ${message} (${err})`);
      }
    }
  }
  return UnitTestingApp;
})();

function testsLive(){
    /**
     * Description: The testsLive function is responsible for running the tests.
     * Args:
     * @param {void}
     * Returns:
     * @return {void}
    */ 

    const test = new UnitTestingApp();
    test.runInGas(true);
    test.enable();

    const input0 = { resourceType: 'Patient' };
    const input1 = { resourceType: 'StructureDefinition' };
    const input2 = { resourceType: 'StructureDefinition', url: 'http://thebomb.com' };
    const input3 = { resourceType: 'OperationOutcome' };
    const input4 = { resourceType: 'OperationOutcome', url: 'http://website.com' };

    if(test.isEnabled) {
        test.assert(getResourceType(input0) === 'Patient', 'getResourceType should return "Patient"');
        test.assert(getResourceType(input1) === 'StructureDefinition', 'getResourceType should return "StructureDefinition"');
        test.assert(getResourceType(input2) === 'StructureDefinition', 'getResourceType should return "StructureDefinition"');
        test.assert(getResourceType(input3) === 'OperationOutcome', 'getResourceType should return "OperationOutcome"');
        test.assert(getResourceType(input4) === 'OperationOutcome', 'getResourceType should return "OperationOutcome"');
    }
    test.disable();
}