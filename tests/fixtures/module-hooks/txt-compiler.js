Module.compilers[".txt"] = (filename, content) => {
  return `export default ${JSON.stringify(content)};`;
};
