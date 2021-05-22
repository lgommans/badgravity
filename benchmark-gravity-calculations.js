let bodies = [{"position":{"x":317036.79980694037,"y":5829555.225834076},"velocity":{"x":0.08523729316218145,"y":0.06283785009225495},"mass":1.9885e+30},{"position":{"x":44436089012.62093,"y":143529911826.7037},"velocity":{"x":-28381.50660633151,"y":8856.847805015788},"mass":5.972e+24},{"orientation":0,"position":{"x":44430502086.20597,"y":143533596465.5547},"velocity":{"x":-33361.175135213845,"y":2765.7004317396168},"mass":420000}];

function lengthdir_x(len, dir) {
    return len * Math.cos(dir / 180 * Math.PI);
}

function lengthdir_y(len, dir) {
    return len * -Math.sin(dir / 180 * Math.PI);
}

function Cart2(x,y) {
	this.x = 0;
	this.y = 0;
	if(x instanceof Cart2) {
		this.x = x.x;
		this.y = x.y;
	}
	else {
		if(x != undefined) {
			this.x = x;
			this.y = y;
		}
	}
	this.sub = function(a) {
		return new Cart2(this.x - a.x, this.y - a.y);
	}

	this.mult = function(m) {
		return new Cart2(this.x * m, this.y * m);
	}

	this.addTo = function(a) {
		this.x += a.x;
		this.y += a.y;
		return this;
	}

	this.invSumCube = function() {
		return Math.pow(this.x*this.x + this.y*this.y, -1.5);
	}

	this.abs = function() {
		return Math.sqrt(this.x*this.x + this.y*this.y);
	}

	this.toString = function(config) {
		let x = this.x;
		let y = this.y;
		let total = Math.sqrt(x*x + y*y);
		if (config && config.multiply) {
			x *= config.multiply;
			y *= config.multiply;
			total *= config.multiply;
		}
		if (config && config.round) {
			if (config.round === true) {
				x = Math.round(x);
				y = Math.round(y);
				total = Math.round(total);
			}
			else {
				let order = Math.pow(10, config.round);
				x = Math.round(x * order) / order;
				y = Math.round(y * order) / order;
				total = Math.round(total * order) / order;
			}
		}
		if (config && config.total) {
			return `${x},${y} ∑${total}`;
		}
		return `${x},${y}`;
	}

	this.angleRadians = function(a) {
		return radians = Math.atan2(this.y - a.y, a.x - this.x);
	};

	this.angle = function(a) {
		let radians = Math.atan2(this.y - a.y, a.x - this.x);
		let degrees = (radians * 180) / Math.PI;
		while (degrees >= 360) degrees -= 360;
		while (degrees < 0) degrees += 360;
		return degrees;
	}
}

for (let i in bodies) {
	bodies[i].velocity = new Cart2(bodies[i].velocity.x, bodies[i].velocity.y);
	bodies[i].position = new Cart2(bodies[i].position.x, bodies[i].position.y);
}


function step_arachnoid(deltatime, gcdt) {
    for (let i in bodies) {
        for (let j in bodies) {
            if (i >= j) {
                continue;
            }
			let separation = bodies[i].position.sub(bodies[j].position);
			let precomputed = gcdt * separation.invSumCube();
			bodies[i].velocity.addTo(separation.mult(bodies[j].mass * -precomputed));
			bodies[j].velocity.addTo(separation.mult(bodies[i].mass * precomputed));
		}
    }

    for (let i in bodies) {
        bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
	}
}

function step_fred(deltatime, gcdt) {
    for (let i in bodies) {
        for (let j in bodies) {
            if (i >= j) {
                continue;
            }
			let separation_x = bodies[i].position.x - bodies[j].position.x;
			let separation_y = bodies[i].position.y - bodies[j].position.y;
			let separation = Math.sqrt(separation_x * separation_x + separation_y * separation_y);
			let grav_accel = bodies[i].mass * bodies[j].mass / (separation * separation) * gcdt;
			let dir_x = separation_x / separation;
			let dir_y = separation_y / separation;
			bodies[i].velocity.x -= grav_accel / bodies[i].mass * dir_x;
			bodies[i].velocity.y -= grav_accel / bodies[i].mass * dir_y;
			bodies[j].velocity.x += grav_accel / bodies[j].mass * dir_x;
			bodies[j].velocity.y += grav_accel / bodies[j].mass * dir_y;
		}
	}

    for (let i in bodies) {
        bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
	}
}

function step_fred_sepsquared(deltatime, gcdt) {
    for (let i in bodies) {
        for (let j in bodies) {
            if (i >= j) {
                continue;
            }
			const separation_x = bodies[i].position.x - bodies[j].position.x;
			const separation_y = bodies[i].position.y - bodies[j].position.y;
			const separation_squared = separation_x * separation_x + separation_y * separation_y;
			const separation = Math.sqrt(separation_squared);
			const grav_accel = bodies[i].mass * bodies[j].mass / separation_squared * gcdt;
			const dir_x = separation_x / separation;
			const dir_y = separation_y / separation;
			bodies[i].velocity.x -= grav_accel / bodies[i].mass * dir_x;
			bodies[i].velocity.y -= grav_accel / bodies[i].mass * dir_y;
			bodies[j].velocity.x += grav_accel / bodies[j].mass * dir_x;
			bodies[j].velocity.y += grav_accel / bodies[j].mass * dir_y;
		}
	}

    for (let i in bodies) {
        bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
	}
}

function step_luc(deltatime, gcdt) {
    for (let i in bodies) {
        for (let j in bodies) {
            if (i >= j) {
                continue;
			}
			let separation_squared = Math.pow(bodies[i].position.x - bodies[j].position.x, 2) + Math.pow(bodies[i].position.y - bodies[j].position.y, 2);
			let grav_accel = bodies[i].mass * bodies[j].mass / separation_squared * gcdt;
			let radians = bodies[i].position.angleRadians(bodies[j].position);
			bodies[i].velocity.x += grav_accel / bodies[i].mass * Math.cos(radians);
			bodies[i].velocity.y += grav_accel / bodies[i].mass * -Math.sin(radians);
			bodies[j].velocity.x -= grav_accel / bodies[j].mass * Math.cos(radians);
			bodies[j].velocity.y -= grav_accel / bodies[j].mass * -Math.sin(radians);
		}
	}

    for (let i in bodies) {
        bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
	}
}

function step_luc_original(deltatime, gcdt) {
    for (let i in bodies) {
        for (let j in bodies) {
            if (i >= j) {
                continue;
			}
			let separation = bodies[i].position.sub(bodies[j].position).abs();
			let masses = bodies[i].mass * bodies[j].mass;
			let grav_accel = GravityConstant * (masses / Math.pow(separation, 2)) * deltatime;
			let degrees = bodies[i].position.angle(bodies[j].position);
			bodies[i].velocity.addTo(new Cart2(lengthdir_x(grav_accel / bodies[i].mass, degrees), lengthdir_y(grav_accel / bodies[i].mass, degrees)));
			degrees += 180;
			bodies[j].velocity.addTo(new Cart2(lengthdir_x(grav_accel / bodies[j].mass, degrees), lengthdir_y(grav_accel / bodies[j].mass, degrees)));
		}
	}

    for (let i in bodies) {
        bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
	}
}

function step_arachnoid_wrong(deltatime, gcdt) {
    for (let i in bodies) {
        for (let j in bodies) {
            if (i == j) {
                continue;
			}

			let radius = bodies[i].position.sub(bodies[j].position);
			bodies[i].velocity.addTo(radius.mult(deltatime * (-GravityConstant * bodies[j].mass * radius.invSumCube())));
			bodies[i].position.addTo(bodies[i].velocity.mult(deltatime));
		}
	}
}


let stepsperrun = 99000;
let deltatime = 10;
let GravityConstant = 6.6742e-11;

let a = 1e9;
let b = 0;
while (a --> 0) {
	b++;
}
console.log('Warmup complete')

versions = [step_fred, step_fred_sepsquared, step_luc, step_luc_original];
for (let i in versions) {
	let version = versions[i];
	let t = new Date().getTime();
	for (let i = 0; i < stepsperrun; i++) {
		version(deltatime, deltatime * GravityConstant);
	}
	console.log(`${version.toString().split('\n')[0]}: ${(new Date().getTime() - t) / stepsperrun * 1000} µs`);
}

