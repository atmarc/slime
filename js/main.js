const d = new DrawTool("myCanvas");
d.setHeight(window.innerHeight);
d.setWidth(window.innerWidth);
// d.setHeight(300);
// d.setWidth(300);
d.background("black");

const n_agents = 10000;
const TRACE_LEN = 100;
const VIEW_LEN = 20;
const VEL = 1;

const rand = () => Math.random();

class Agent {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.traces = [];
    }

    draw() {
        let s = 7;
        // d.translate(this.x, this.y);
        // d.rotate(this.angle);
        // d.startFillLine(-s, -s);
        // d.fillLine(-s, s);
        // d.fillLine(s, 0);
        // d.endFillLine();
        // d.rotate(-this.angle);
        // d.translate(-this.x, -this.y);
        
        // d.circle(this.x, this.y, 2, {"color":"white"});

        // for (let i = 0; i < this.traces.length; ++i) {
        //     let x = this.traces[i][0];
        //     let y = this.traces[i][1];
        //     // d.dot(x, y, {"color":"white"});
        // }
    }

    step() {

        let turn_angle = Math.PI/8;
        const [center, left, right] = this.sensors();
        let add_angle = 0;
        if (center > left && center > right) {
            add_angle = 0;
        }
        else if (left > center && right > center) {
            add_angle = turn_angle;
            if (rand() > 0.5) add_angle = -turn_angle;
        }
        else if (right > left) {
            add_angle = turn_angle;
        }
        
        else if (left > right) {
            add_angle = -turn_angle;
        }
        this.angle += add_angle;
        this.x += Math.cos(this.angle) * VEL;
        this.y += Math.sin(this.angle) * VEL;
    }

    sensors() {
        let x1 = parseInt(this.x + VIEW_LEN * Math.cos(this.angle));
        let y1 = parseInt(this.y + VIEW_LEN * Math.sin(this.angle));
        let v1 = pos_ok(x1, y1) ? trace_mat[x1][y1] : -1;
        // d.circle(x1, y1, 4, {"color":"blue"});

        let x2 = parseInt(this.x + VIEW_LEN * Math.cos(this.angle - (Math.PI/4)));
        let y2 = parseInt(this.y + VIEW_LEN * Math.sin(this.angle - (Math.PI/4)));
        let v2 = pos_ok(x2, y2) ? trace_mat[x2][y2] : -1;
        // d.circle(x2, y2, 4, {"color":"blue"});

        let x3 = parseInt(this.x + VIEW_LEN * Math.cos(this.angle + (Math.PI/4)));
        let y3 = parseInt(this.y + VIEW_LEN * Math.sin(this.angle + (Math.PI/4)));
        let v3 = pos_ok(x3, y3) ? trace_mat[x3][y3] : -1;
        // d.circle(x3, y3, 4, {"color":"blue"});

        return [v1, v2, v3];
    }
}


var trace_mat = new Array(d.width);
for (let i = 0; i < trace_mat.length; ++i) 
trace_mat[i] = new Array(d.height).fill(0);


var agents = [];
for (let i = 0; i < n_agents; ++i) {
    // for (let j = 0; j < 50; ++j) {
    // agents.push(new Agent(100 + i*10,100 + j*10, rand()*Math.PI*2));
    agents.push(new Agent(rand()*d.width, rand()*d.height, rand()*Math.PI*2));
    // }
}

function pos_ok(x, y) {
    return x >= 0 && x < d.width && y >= 0 && y < d.height;
}

function computeTrace(agent) {
    let x = parseInt(agent.x);
    let y = parseInt(agent.y);
    
    if (pos_ok(x, y)) {
        agent.traces.push([x, y]);
        trace_mat[x][y] = TRACE_LEN;
    }
    
    for (let i = 0; i < agent.traces.length; ++i) {
        let pos_x = agent.traces[i][0];
        let pos_y = agent.traces[i][1];
        if (trace_mat[pos_x][pos_y] > 0) {
            trace_mat[pos_x][pos_y] -= 1;
        }
        else {
            let pos = agent.traces.shift();
            // d.dot(pos[0], pos[1], {color: "black"});
        }
    }
}

var frame = 0;
var t0 = performance.now();

function update() {
    // d.clearAll();
    // d.background("black");
    for (let i = 0; i < n_agents; ++i) {
        agents[i].step();
        // agents[i].draw();
        computeTrace(agents[i]);
    }
    var image_data = d.ctx.createImageData(d.width, d.height);
    let index = 0;

    for (let i = 0; i < trace_mat[0].length; ++i) {
        for (let j = 0; j < trace_mat.length; ++j) {
            let px_color = trace_mat[i][j] * 1.5;
            image_data.data[index] = px_color;       // R
            image_data.data[index + 1] = px_color;   // G
            image_data.data[index + 2] = px_color;   // B
            image_data.data[index + 3] = 255;   // A
            index += 4;
        }
    }
    d.ctx.putImageData(image_data, 0, 0);
    
    frame += 1;
    if (frame % 100 == 0) {
        let t1 = performance.now();
        let dt = (t1 - t0) / 1000;
        let fps = parseInt(frame / dt);
        console.log(fps + ' fps');
        frame = 0;
        t0 = t1;
    }
    window.requestAnimationFrame(update);
}    

window.requestAnimationFrame(update);

// var myInterval = setInterval(update, ms);

// onkeydown = (event) => {
//     if (event.code === 'Space') {
//         if (myInterval === -1) {
//             myInterval = setInterval(update, ms);
//         }
//         else {
//             clearInterval(myInterval);
//             myInterval = -1;
//         }
//     }
// }