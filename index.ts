declare const __dirname: string;
declare const require: any;

const addTypeScriptFile = require('add-typescript-file-to-project');
const fs = require('fs');
const mkpath = require('mkpath');
const search = require('recursive-search');
const xml2js = require('xml2js');

const virtualProjectRoot = '\\..\\..\\..\\';
let nestedResources: boolean = true;

interface Dictionary {
    [key: string]: string | Dictionary;
}

export function executeResxToTs(typeScriptResourcesNamespace: string, virtualResxFolder: string, virtualTypeScriptFolder: string, generateNestedResources: boolean = true): void {
    nestedResources = generateNestedResources;
    let files = getFilesFromFolder(virtualResxFolder);
    
    if (files !== undefined && files !== null) {
        for (let i = 0, length = files.length; i < length; i++) {   
            const resxFilename = files[i];
            convertResxToTypeScriptModel(resxFilename, typeScriptResourcesNamespace, virtualTypeScriptFolder);
        }
    }
}

export function executeResxToJson(virtualResxFolder: string, virtualJsonFolder: string, fileNameLanguage?: string, generateNestedResources: boolean = true): void {
    nestedResources = generateNestedResources;
    let files = getFilesFromFolder(virtualResxFolder);
    
    if (files !== undefined && files !== null) {
        for (let i = 0, length = files.length; i < length; i++) {   
            const resxFilename = files[i];
            convertResxToJson(resxFilename, virtualJsonFolder, fileNameLanguage);
        }
    }
}

function getFilesFromFolder(virtualResxFolder: string): any {
    let files: any = null;

    if (virtualResxFolder === undefined || virtualResxFolder === '') {
        files = search.recursiveSearchSync(/.resx$/, __dirname + virtualProjectRoot );   
    } 
    else {
        virtualResxFolder = virtualResxFolder.replace(/\//g, '\\');
        
        let safeVirtualFolder = virtualResxFolder;
        
        if (safeVirtualFolder.charAt(0) === '\\')
        {
            safeVirtualFolder = safeVirtualFolder.substr(1);
        } 
        if (safeVirtualFolder.charAt(safeVirtualFolder.length-1) === '\\')
        {
            safeVirtualFolder = safeVirtualFolder.substr(0, safeVirtualFolder.length-1);
        } 
        
        files = search.recursiveSearchSync(/.resx$/, __dirname + virtualProjectRoot + safeVirtualFolder );      
    }
    
    if (files !== undefined && files !== null) {
        const filesAsString = JSON.stringify(files).replace('[', "").replace(']', "");
        const splittedFiles = filesAsString.split(',');
        let cleanedFiles = splittedFiles.map((fileName) => fileName.trim().replace(/"/g,"").replace(/\\\\/g,"\\")); 

        return cleanedFiles;
    }
}

function convertResxToTypeScriptModel(resxFilename: string, typeScriptResourcesNamespace: string, virtualTypeScriptFolder: string): void {
    fs.readFile(resxFilename, function(err: any, data: any) {
        const parser = new xml2js.Parser();

        parser.parseString(data, function (err: any, result: any) {
            if (result !== undefined) {
                convertXmlToTypeScriptModelFile(result, resxFilename, typeScriptResourcesNamespace, virtualTypeScriptFolder);                       
            }
        });  
    });    
}

function convertResxToJson(resxFilename: string, virtualJsonFolder: string, fileNameLanguage?: string): void {
    fs.readFile(resxFilename, function(err: any, data: any) {
        const parser = new xml2js.Parser();

        parser.parseString(data, function (err: any, result: any) {
            if (result !== undefined) {
                convertXmlToJsonFile(result, resxFilename, virtualJsonFolder, fileNameLanguage);                       
            }
        });  
    });    
}

function convertXmlToDictionary(xmlObject: any) {
    let dictionary: Dictionary = {};

    if (xmlObject.root.data !== undefined) { 
        for (let i = 0, nrOfResourcesInFile = xmlObject.root.data.length; i < nrOfResourcesInFile; i++) {
            const key = xmlObject.root.data[i].$.name; // 
            const value =  xmlObject.root.data[i].value.toString();   

            parseToDictionaryItem(key, value, dictionary);  
        }           
    }

    return dictionary;
}

function parseToDictionaryItem(key: string, value: string, dictionary: Dictionary) {
    if (!dictionary) {
        dictionary = {};
    }

    if (!key.length) {
        return;
    }

    let nestedKeyIndex = key.indexOf("_");

    if (nestedKeyIndex >= 0 && nestedResources) {
        let firstKey = key.substring(0, nestedKeyIndex);
        let restKey = key.substring(nestedKeyIndex + 1);

        if (!dictionary.hasOwnProperty(firstKey)) {
            dictionary[firstKey] = <Dictionary>{};
        }

        parseToDictionaryItem(restKey, value, <Dictionary>dictionary[firstKey])
    } else {
        dictionary[key] = value;
    }
}

function convertDictionaryToTsMapping(dictionary: Dictionary, nest: number) {
    let nestedTabs = "";
    for (var i = 0; i < nest; i++) {
        nestedTabs += "\t";
    }

    var childNestedTabs = nestedTabs + "\t";
    var result = "{\n";

    var keys = Object.keys(dictionary);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = dictionary[key];
        if (typeof value == "string") {
            result += childNestedTabs + key + ": string";
        } 
        else if (typeof value == "object") {
            result += childNestedTabs + key + ": " + convertDictionaryToTsMapping(<Dictionary>value, nest + 1);
        }
        result += ";\n";
    }

    result += nestedTabs + "}";

    return result;
}

function convertXmlToTypeScriptModelFile(xmlObject: any, resxFilename: string, typeScriptResourcesNamespace: string, virtualTypeScriptFolder: string): void {
    const projectRoot = getProjectRoot();
    const relativeResxFilename = resxFilename.replace(projectRoot, "").replace(/\\/g, "/");
    const className = resxFilename.substr(resxFilename.lastIndexOf("\\") + 1).replace('.resx', '').replace(".", "_");

    let content = '// TypeScript Resx model for: ' + relativeResxFilename + '\n' + 
                    '// Auto generated by resx-to-ts-json (npm package)' + '\n' + '\n';

    content = content + 'declare module ' + typeScriptResourcesNamespace + ' {\n';
    content = content + '\texport class ' + className + ' ';

    let dictionary = convertXmlToDictionary(xmlObject);
    content = content + convertDictionaryToTsMapping(dictionary, 1);
    content = content + '\n}\n';
    
    // Write model if resources found
    if (Object.keys(dictionary).length > 0) {
        const relativeTsFilename = relativeResxFilename.replace('.resx', '.d.ts');
        const tsFileName = resxFilename.replace('.resx', '.d.ts');
        
        if (virtualTypeScriptFolder === undefined || virtualTypeScriptFolder === '') {
            // Write the file aside of the the resx file.
            fs.writeFile(tsFileName, content, null);                           

            addTypeScriptFile.execute(tsFileName);                          
        }
        else {
            // Write the file to the given output folder.
            const tsFileNameWithoutPath = tsFileName.substr(tsFileName.lastIndexOf('\\') + 1);
            const outputFileName = (projectRoot + virtualTypeScriptFolder + '\\' + tsFileNameWithoutPath).split('/').join('\\');
            const relativeOutputFileName = virtualTypeScriptFolder + '/' + tsFileNameWithoutPath;

            mkpath.sync(projectRoot + virtualTypeScriptFolder, '0700');
            
            fs.writeFile(outputFileName, content, null); 
            
            addTypeScriptFile.execute(relativeOutputFileName);                          
        }
    }
}

function convertXmlToJsonFile(xmlObject: any, resxFilename: string, virtualJsonFolder: string, fileNameLanguage?: string): void {
    const projectRoot = getProjectRoot();
    const relativeResxFilename = resxFilename.replace(projectRoot, "").replace(/\\/g, "/");

    let dictionary = convertXmlToDictionary(xmlObject);
    let content = JSON.stringify(dictionary);
    
    // Write model if resources found
    if (Object.keys(dictionary).length > 0) {
        const relativeJsonFilename = relativeResxFilename.replace('.resx', '.json');
        const jsonFileName = resxFilename.replace('.resx', '.json');
        
        if (virtualJsonFolder === undefined || virtualJsonFolder === '') {
            // Write the file aside of the the resx file.
            fs.writeFile(jsonFileName, content, null);                           
        }
        else {
            // Write the file to the given output folder.
            let jsonFileNameWithoutPath = jsonFileName.substr(jsonFileName.lastIndexOf('\\') + 1);
            if (fileNameLanguage) {
                let fileNameWithoutExtension = jsonFileNameWithoutPath.substring(0, jsonFileNameWithoutPath.indexOf(".json"))
                jsonFileNameWithoutPath = `${fileNameWithoutExtension}.${fileNameLanguage}.json`;
            }

            const outputFileName = (projectRoot + virtualJsonFolder + '\\' + jsonFileNameWithoutPath).split('/').join('\\');
            const relativeOutputFileName = virtualJsonFolder + '/' + jsonFileNameWithoutPath;

            mkpath.sync(projectRoot + virtualJsonFolder, '0700');
            
            fs.writeFile(outputFileName, content, null); 
        }
    }
}

function getProjectRoot(): string {
    const splittedDirName = __dirname.split('\\');
    const splittedRootDirName: Array<string> = [];
    
    for (let i = 0, length = splittedDirName.length - 3; i < length; i++) {
        splittedRootDirName.push(splittedDirName[i]);
    }
    
    return splittedRootDirName.join('\\');
}

function decapitalizeFirstLetter(input: string) {
    return input.charAt(0).toLowerCase() + input.slice(1);
}