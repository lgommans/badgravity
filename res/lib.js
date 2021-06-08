function $(q) {
	return document.querySelector(q);
}

function lengthdir_x(len, dir) {
	return len * Math.cos(dir / 180 * Math.PI);
}

function lengthdir_y(len, dir) {
	return len * -Math.sin(dir / 180 * Math.PI);
}

Number.prototype.toSIPrefix = function(unit, precision, separator) {
    // Precision is the number of decimal positions desired
    // val = 123e3; val.toSIPrefix('Wh') -> '123kWh'
    // val = 123456; val.toSIPrefix('Wh', 1, ' ') -> '123.5 kWh'

    if (precision === undefined) {
        precision = 0;
    }

    if (separator === undefined) {
        separator = '';
    }

    let exponent = parseInt(Math.floor(Math.log10(Math.abs(this.valueOf()))/3)*3);

    if (exponent < -24 || exponent > 24) {
        // toFixed also adds an exponent for numbers above 1e20 (undocumented, let's hope that's universal and not "resolved" now that I use it as a "feature"...)
        return this.valueOf().toFixed(precision).toString() + separator + unit;
    }

    return (this.valueOf() / Math.pow(10, exponent)).toFixed(precision).toString() + separator + {
        '-24': 'y',
        '-21': 'z',
        '-18': 'a',
        '-15': 'f',
        '-12': 'p',
         '-9': 'n',
         '-6': 'µ',
         '-3': 'm',
          '0': '',
          '3': 'k',
          '6': 'M',
          '9': 'G',
         '12': 'T',
         '15': 'P',
         '18': 'E',
         '21': 'Z',
         '24': 'Y',
    }[exponent.toString()] + unit;
};

function escapeHtml(text) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function BBCode(input) {
	return input
		.replace(/\r/g, '')
		.replace(/\n/g, '<br>')
		.replace(/\[b\]/g, '<strong>')
		.replace(/\[\/b\]/g, '</strong>')
		.replace(/\[i\]/g, '<i>')
		.replace(/\[\/i\]/g, '</i>')
		.replace(/\[u\]/g, '<u>')
		.replace(/\[\/u\]/g, '</u>')
		.replace(/\[ul\]/g, '<ul>')
		.replace(/\[\/ul\]/g, '</ul>')
		.replace(/\[ol\]/g, '<ol>')
		.replace(/\[\/ol\]/g, '</ol>')
		.replace(/\[li\]/g, '<li>')
		;
}

//function Benchmark(avginterval, targetfps) {
//	/* NOT SURE THIS IS CORRECT / WORKS BUG-FREE
//	 *
//	 * let b = new Benchmark(30, 60);
//	 * console.log(b.frame())
//	 * => [57, 40, 59]
//	 *      |   |   |
//	 *      |   |   the average fps over the last avginterval frames
//	 *      |   the minimum fps, based on a single frame time, within the last avginterval frames 
//	 *      fps based on the most recent single frame time
//	 */
//
//	this.framecounter = 0;
//	this.lastframe = performance.now();
//	this.avgfpsstarttime = performance.now();
//	this.avgfps = -1;
//	this.avginterval = avginterval;
//	this.targetinterval = 1000 / targetfps; // ms
//	this.targetfps = targetfps;
//	this.minfps = targetfps;
//
//	this.frame = function() {
//		this.framecounter++;
//
//		if (this.framecounter % this.avginterval == 0) {
//			this.avgfps = this.targetinterval / ((performance.now() - this.avgfpsstarttime) / this.avginterval) * this.targetfps;
//			this.avgfpsstarttime = performance.now();
//			this.minfps = this.targetfps;
//		}
//
//		this.frametime = performance.now() - this.lastframe;
//		let nowfps = this.targetinterval / this.frametime * this.targetfps
//		this.minfps = Math.min(this.minfps, nowfps);
//
//		this.lastframe = performance.now();
//
//		return [nowfps, this.minfps, this.avgfps];
//	};
//}

