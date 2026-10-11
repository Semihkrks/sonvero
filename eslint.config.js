import js from '@eslint/js';
import globals from 'globals';
export default [{ignores:['src/react/**']},js.configs.recommended,{languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:{...globals.browser,...globals.node}},rules:{'no-unused-vars':['warn',{argsIgnorePattern:'^_'}],'no-empty':['error',{allowEmptyCatch:true}]}}];
