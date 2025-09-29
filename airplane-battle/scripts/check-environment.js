#!/usr/bin/env node

/**
 * 环境检查脚本
 * 检查Node.js和NPM版本是否满足项目要求
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');

function checkEnvironment() {
  try {
    // 读取package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const engines = packageJson.engines || {};
    
    console.log('🔍 检查开发环境...\n');
    
    // 检查Node.js版本
    const currentNodeVersion = process.version;
    const requiredNodeVersion = engines.node;
    
    console.log(`Node.js:`);
    console.log(`  当前版本: ${currentNodeVersion}`);
    console.log(`  要求版本: ${requiredNodeVersion || '未指定'}`);
    
    if (requiredNodeVersion) {
      const nodeVersionMatch = currentNodeVersion.match(/^v(\d+)\.(\d+)\.(\d+)/);
      const requiredVersionMatch = requiredNodeVersion.match(/>=(\d+)\.(\d+)\.(\d+)/);
      
      if (nodeVersionMatch && requiredVersionMatch) {
        const [, currentMajor, currentMinor, currentPatch] = nodeVersionMatch.map(Number);
        const [, requiredMajor, requiredMinor, requiredPatch] = requiredVersionMatch.map(Number);
        
        const currentVersionNum = currentMajor * 10000 + currentMinor * 100 + currentPatch;
        const requiredVersionNum = requiredMajor * 10000 + requiredMinor * 100 + requiredPatch;
        
        if (currentVersionNum >= requiredVersionNum) {
          console.log(`  ✅ Node.js版本符合要求\n`);
        } else {
          console.log(`  ❌ Node.js版本过低，请升级到 ${requiredNodeVersion}\n`);
          console.log(`升级建议:`);
          console.log(`  1. 使用nvm: nvm install 18.20.4 && nvm use 18.20.4`);
          console.log(`  2. 从官网下载: https://nodejs.org/\n`);
          return false;
        }
      }
    }
    
    // 检查NPM版本
    const requiredNpmVersion = engines.npm;
    console.log(`NPM:`);
    console.log(`  要求版本: ${requiredNpmVersion || '未指定'}`);
    
    if (requiredNpmVersion) {
      console.log(`  💡 请运行 'npm --version' 检查NPM版本\n`);
    }
    
    // 检查关键依赖
    console.log(`关键依赖:`);
    console.log(`  React: ${packageJson.dependencies?.react || '未安装'}`);
    console.log(`  Vite: ${packageJson.dependencies?.vite || '未安装'}`);
    console.log(`  TypeScript: ${packageJson.dependencies?.typescript || '未安装'}`);
    console.log(`  Terser: ${packageJson.devDependencies?.terser || '未安装 (构建时需要)'}\n`);
    
    console.log(`✅ 环境检查完成！`);
    console.log(`📚 如果遇到问题，请参考项目README或联系开发团队。\n`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ 环境检查失败:`, error.message);
    return false;
  }
}

// 运行检查
if (process.argv[1] && process.argv[1].endsWith('check-environment.js')) {
  const success = checkEnvironment();
  process.exit(success ? 0 : 1);
}

export { checkEnvironment };