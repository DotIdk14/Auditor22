import fs from 'fs';
import path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';

const DIST_DIR = path.resolve('./dist');

function getAllJsFiles(dirPath, filesList = []) {
  if (!fs.existsSync(dirPath)) return filesList;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllJsFiles(fullPath, filesList);
    } else if (file.endsWith('.js') && !file.endsWith('.min.js')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

function obfuscateBuild() {
  console.log('🔒 Cambiando código a formato seguro...');
  const jsFiles = getAllJsFiles(DIST_DIR);
  if (jsFiles.length === 0) {
    console.warn('⚠️ No se encontraron archivos JS para procesar.');
    return;
  }
  for (const file of jsFiles) {
    try {
      const code = fs.readFileSync(file, 'utf8');
      const result = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: false,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: false,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.5,
        stringArrayEncoding: [],
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false
      });
      fs.writeFileSync(file, result.getObfuscatedCode(), 'utf8');
      console.log(` ✅ Código protegido: ${path.basename(file)}`);
    } catch (err) {
      console.error(` ❌ Error procesando ${path.basename(file)}:`, err);
    }
  }
  console.log('🔒 Proceso completado con éxito.');
}

obfuscateBuild();
