/**
* Boilerplate that all Plugins share - and should not be used
* directly. It also shows which methods final plugins should implement/override,
* this deciding on structure.
*
* @param {core} main Uppy core object
* @param {opts} object with plugin options
* @returns results — an array of files, success or fail message
*/
export default class Plugin {

  constructor(core, opts) {
    this.core = core;
    this.opts = opts;
    this.type = 'none';
    this.name = this.constructor.name;
  }

  setProgress(percentage, current, total) {
    var finalPercentage = percentage;

    if (current !== undefined && total !== undefined) {
      var percentageOfTotal = (percentage / total);
      finalPercentage = percentageOfTotal;
      if (current > 0) {
        finalPercentage = percentage + (100/total*current);
      } else {
        finalPercentage = (current * percentage);
      }
    }

    this.core.setProgress(this, finalPercentage);
  }

  extractFiles(results) {
    console.log({
      class  : 'Plugin',
      method : 'extractFiles',
      results: results
    });

    console.log('-------');
    const files = [];
    results.forEach(result => {
      Array.from(result.files).forEach(file => files.push(file));
    });

    // const files = [];
    // for (let i in results) {
    //   // console.log('yo12131');
    //   // console.log(results[i].files);
    //   for (let j in results[i].files) {
    //     console.log(results[i].files.item(j));
    //     // files.push(results[i].files.item(j));
    //   }
    // }

    // return Array.from(fileList);
    return files;
  }

  run(results) {
    return results;
  }
}