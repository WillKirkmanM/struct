type Converter = (json: string) => string;

const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getType = (value: any, language: 'typescript' | 'python' | 'go' | 'rust'): string => {
    if (Array.isArray(value)) {
      const itemType = value.length > 0 ? getType(value[0], language) : (
        language === 'typescript' ? 'any' :
        language === 'python' ? 'Any' :
        language === 'go' ? 'interface{}' :
        'T'
      );
      switch (language) {
        case 'typescript':
          return `${itemType}[]`;
        case 'python':
          return `List[${itemType}]`;
        case 'go':
          return `[]${itemType}`;
        case 'rust':
          return `Vec<${itemType}>`;
      }
    }
  
    if (value === null) {
      switch (language) {
        case 'typescript': return 'null';
        case 'python': return 'None';
        case 'go': return 'interface{}';
        case 'rust': return 'Option<()>';
      }
    }
  
    switch (typeof value) {
      case 'string':
        switch (language) {
          case 'typescript': return 'string';
          case 'python': return 'str';
          case 'go': return 'string';
          case 'rust': return 'String';
        }
        break;
      case 'number':
        if (Number.isInteger(value)) {
          switch (language) {
            case 'typescript': return 'number';
            case 'python': return 'int';
            case 'go': return 'int';
            case 'rust': return 'i32';
          }
        } else {
          switch (language) {
            case 'typescript': return 'number';
            case 'python': return 'float';
            case 'go': return 'float64';
            case 'rust': return 'f64';
          }
        }
        break;
      case 'boolean':
        switch (language) {
          case 'typescript': return 'boolean';
          case 'python': return 'bool';
          case 'go': return 'bool';
          case 'rust': return 'bool';
        }
        break;
      case 'object':
        const keys = Object.keys(value);
        if (language === 'typescript') {
          return `{ ${keys.map(k => `${k}: any`).join('; ')} }`;
        }
        if (language === 'python') {
          return `{${keys.map(k => `'${k}': Any`).join(', ')}}`;
        }
        if (language === 'go') {
          return `struct { ${keys.map(k => `${capitalizeFirstLetter(k)} interface{}`).join('; ')} }`;
        }
        if (language === 'rust') {
          return `struct { ${keys.map(k => `${k}: ()`).join(', ')} }`;
        }
        break;
      default:
        switch (language) {
          case 'typescript': return 'any';
          case 'python': return 'Any';
          case 'go': return 'interface{}';
          case 'rust': return 'T';
        }
    }
    return 'any';
  };
  
const generateTypeScriptInterface = (obj: any, interfaceName = 'Root'): string => {
  let result = '';
  let mainContent = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedName = capitalizeFirstLetter(key);
      mainContent += `  ${key}: ${nestedName};\n`;
    } else {
      const type = getType(value, 'typescript');
      mainContent += `  ${key}: ${type};\n`;
    }
  }
  
  const mainInterface = `interface ${interfaceName} {\n${mainContent}}\n\n`;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedName = capitalizeFirstLetter(key);
      result += generateTypeScriptInterface(value, nestedName);
    }
  }
  
  return result + mainInterface;
};

const generatePythonClass = (obj: any, className = 'Root', isNested = false): string => {
  let output = isNested ? '' : 'from dataclasses import dataclass\nfrom typing import List, Optional\n\n';
  let classes = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedName = capitalizeFirstLetter(key);
      classes += generatePythonClass(value, nestedName, true);
    }
  }
  
  output += `@dataclass\nclass ${className}:\n`;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      output += `    ${key}: '${capitalizeFirstLetter(key)}'\n`;
    } else {
      const type = getType(value, 'python');
      output += `    ${key}: ${type}\n`;
    }
  }
  
  return classes + output + '\n';
};

const generateGoStruct = (obj: any, structName = 'Root', isNested = false): string => {
  let structs = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedName = capitalizeFirstLetter(key);
      structs += generateGoStruct(value, nestedName, true);
    }
  }
  
  let output = 'type ' + structName + ' struct {\n';
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = capitalizeFirstLetter(key);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      output += `\t${fieldName} ${capitalizeFirstLetter(key)} \`json:"${key}"\`\n`;
    } else {
      const type = getType(value, 'go');
      output += `\t${fieldName} ${type} \`json:"${key}"\`\n`;
    }
  }
  
  output += '}\n\n';
  return structs + output;
};

const generateRustStruct = (obj: any, structName = 'Root', isNested = false): string => {
  let structs = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedName = capitalizeFirstLetter(key);
      structs += generateRustStruct(value, nestedName, true);
    }
  }
  
  let output = '#[derive(Debug, Serialize, Deserialize)]\n';
  output += `pub struct ${structName} {\n`;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      output += `    #[serde(rename = "${key}")]\n`;
      output += `    pub ${key}: ${capitalizeFirstLetter(key)},\n`;
    } else {
      const type = getType(value, 'rust');
      output += `    #[serde(rename = "${key}")]\n`;
      output += `    pub ${key}: ${type},\n`;
    }
  }
  
  output += '}\n\n';
  return structs + output;
};

export const languageConverters: Record<string, Converter> = {
  typescript: (json: string) => generateTypeScriptInterface(JSON.parse(json)),
  python: (json: string) => generatePythonClass(JSON.parse(json)),
  go: (json: string) => generateGoStruct(JSON.parse(json)),
  rust: (json: string) => generateRustStruct(JSON.parse(json))
};