# resx-to-ts-json

Source code for the resx-to-ts-json node module, originally forked from resx-to-typescript

This node module converts resx files to TypeScript definition files and JSON files. 

It supports having nested resources through underscore separated keys in the resx. For example, if you have two resources in your resx with keys "Home_help" and "Home_button", the `.d.ts` and `.json` files would look like so:

```typescript
//.d.ts
Home: {
    help: string;
    button: string;
}

//.json
Home: {
    help: "Help string",
    button: "Button text"
}
```

The script has two exported functions:

```typescript
function executeResxToTs(typeScriptResourcesNamespace: string, virtualResxFolder: string, virtualTypeScriptFolder: string, generateNestedResources: boolean = true): void;
function executeResxToJson(virtualResxFolder: string, virtualJsonFolder: string, generateNestedResources: boolean = true, fileNameLanguage?: string): void;
```

* `executeResxToTs` converts all resx files in the `virtualResxFolder` to TypeScript definition files (.d.ts) with the namespace defined as `typeScriptResourcesNamespace` and outputs these files to `virtualTypeScriptFolder`.

* `executeResxToJson` converts all resx files in the `virtualResxFolder` to JSON files (.json) which can be loaded in the application and outputs them to `virtualJsonFolder`.
Optionally, you can specify a `fileNameLanguage` string to append to the file name, so if "en" was specified, the filename would be filename.en.json.

By default, the option to nest the resources is enabled. To disable this functionality specify `generateNestedResources = false`.

## Usage

To use this node module add a reference to your project package.json dependencies.
```json
{
    "dependencies": {
        "resx-to-ts-json": "1.0.14"
    }
}
```

To use the module in for instance a gulp task:

```javascript
var resxConverter = require('resx-to-ts-json');
resxConverter.executeResxToTs('exampleApp.resources', '/Resources', '/App/Resources');
resxConverter.executeResxToJson('/Resources', '/App/Resources/Json');
```

where the parameters stand for:

* `exampleApp.resources`: TypeScript module name / namespace for the resource models.  
* `/Resources`: Relative folder to scan for .resx files.  
* `/App/Resources`: Output directory for TypeScript files  
* `/App/Resources/Json`: Output directory for JSON files  


## Changelog
2017-05-19 Add possibility to disable resource nesting

2017-02-13 Remove unnecessary escaping of single quotes in string values. (v 1.0.14)

2016-09-20 Switched to creating a typescript definition file (.d.ts), json file (.json), and added support for
                nested resources using '_' between key names. (v 1.0.13)
                
2016-08-19 Refactored code and added support for multi line resources. (v 1.0.12)

Voilá, the TypeScript models for your resx files are added to your project and ready to use in typescript development/mvc bundling.
