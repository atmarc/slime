const d = new DrawTool("myCanvas");
d.setHeight(window.innerHeight);
d.setWidth(window.innerWidth);
// d.setHeight(500);
// d.setWidth(500);

const N_AGENTS = 50000;
const TRACE_LEN = 300;
const VIEW_LEN = 15;
const VEL = 1;
const EVAPORATE = 1;
const DIFFUSION = 1;
const TURN_ANGLE = Math.PI/4;

const rand = () => Math.random();

class Agent {
    constructor(x, y, angle, species) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.species = species;
    }

    update_agent() {
        this.step();
        let x = Math.floor(this.x);
        let y = Math.floor(this.y);
        
        if (pos_ok(x, y)) {
            trace_mat[y][x] = this.species * (TRACE_LEN + 1);
        }
    }

    step() {
        // ----------------- Sensors ------------------
        let x1 = Math.round(this.x + VIEW_LEN * Math.cos(this.angle));
        let y1 = Math.round(this.y + VIEW_LEN * Math.sin(this.angle));
        let pos = pbc(x1, y1);
        let center = this.species * trace_mat[pos[1]][pos[0]];

        let x2 = Math.round(this.x + VIEW_LEN * Math.cos(this.angle - TURN_ANGLE));
        let y2 = Math.round(this.y + VIEW_LEN * Math.sin(this.angle - TURN_ANGLE));
        pos = pbc(x2, y2);
        let left = this.species * trace_mat[pos[1]][pos[0]];

        let x3 = Math.round(this.x + VIEW_LEN * Math.cos(this.angle + TURN_ANGLE));
        let y3 = Math.round(this.y + VIEW_LEN * Math.sin(this.angle + TURN_ANGLE));
        pos = pbc(x3, y3);
        let right = this.species * trace_mat[pos[1]][pos[0]];
        // --------------------------------------------

        let add_angle = 0;
        if (center > left && center > right) {
            add_angle = 0;
        }
        else if (left > center && right > center) {
            add_angle = TURN_ANGLE;
            if (rand() > 0.5) add_angle = -TURN_ANGLE;
        }
        else if (right > left) {
            add_angle = TURN_ANGLE;
        }
        
        else if (left > right) {
            add_angle = -TURN_ANGLE;
        }

        add_angle *= rand();
        this.angle += add_angle;

        let new_x = this.x + Math.cos(this.angle) * VEL;
        let new_y = this.y + Math.sin(this.angle) * VEL;
        
        pos = pbc(new_x, new_y);

        this.x = pos[0];
        this.y = pos[1];
    }
}


function pos_ok(x, y) {
    return x >= 0 && x < trace_mat[0].length && y >= 0 && y < trace_mat.length;
}

function pbc(x, y) {
    let new_x = x < 0 ? trace_mat[0].length + x : x % trace_mat[0].length;
    let new_y = y < 0 ? trace_mat.length + y : y % trace_mat.length;
    return [new_x, new_y];
}

function render_frame() {
    var image_data = d.ctx.createImageData(d.width, d.height);
    let index = 0;

    // Init new trace mat
    var new_trace_mat = new Array(d.height);
    for (let i = 0; i < new_trace_mat.length; ++i) 
        new_trace_mat[i] = new Array(d.width).fill(0);

    // Compute bluring
    var bluring = (x, y) => {
        let sum = 0;
        for (let offset_x = -1; offset_x <= 1; ++offset_x) {
            for (let offset_y = -1; offset_y <= 1; ++offset_y) {
                if (pos_ok(x + offset_x, y + offset_y))
                    sum += trace_mat[y + offset_y][x + offset_x];
            }
        }
        return sum / 9;
    }

    var put_image_data = (i, R, G, B) => {
        image_data.data[i] = R;     
        image_data.data[i + 1] = G; 
        image_data.data[i + 2] = B; 
        image_data.data[i + 3] = 255;
    }
    
    let color_ratio = 255/TRACE_LEN;
    // Go through every pixel
    for (let i = 0; i < trace_mat.length; ++i) {
        for (let j = 0; j < trace_mat[0].length; ++j) {
            
            if (trace_mat[i][j] > 0) {
                trace_mat[i][j] -= EVAPORATE;
                let px_color = trace_mat[i][j] * color_ratio;
                put_image_data(index, px_color, 0, 0);
            } 
            // ---------- Code for 2 species ----------
            else if (trace_mat[i][j] < 0) {
                trace_mat[i][j] += EVAPORATE;
                let px_color = -trace_mat[i][j] * color_ratio;
                put_image_data(index, 0, px_color, 0);
            }
            else {
                put_image_data(index, 0, 0, 0);
            }
            
            index += 4;
            
            if (frame % DIFFUSION == 0) new_trace_mat[i][j] = bluring(j, i); 
            else new_trace_mat[i][j] = trace_mat[i][j]; 
        }
    }

    trace_mat = new_trace_mat;

    d.ctx.putImageData(image_data, 0, 0);
}

function print_fps() {
    frame += 1;
    if (frame % 100 == 0) {
        let t1 = performance.now();
        let dt = (t1 - t0) / 1000;
        let fps = parseInt(frame / dt);
        console.log(fps + ' fps');
        frame = 0;
        t0 = t1;
    }
}


function update() {
    for (let i = 0; i < N_AGENTS; ++i) {
        agents[i].update_agent();
    }
    
    render_frame();
    print_fps();

    if (!pause) window.requestAnimationFrame(update);
}    


var frame = 0;
var t0 = performance.now();

var trace_mat = new Array(d.height);
for (let i = 0; i < trace_mat.length; ++i) 
    trace_mat[i] = new Array(d.width).fill(0);


var agents = [];
for (let i = 0; i < N_AGENTS; ++i) {
    let species = rand() > 0.5 ? 1 : -1;
    // let species = 1;
    // agents.push(new Agent(rand()*d.width, rand()*d.height, rand()*Math.PI*2, species));
    agents.push(new Agent(d.width/2, d.height/2, rand()*Math.PI*2, species));
}


window.requestAnimationFrame(update);

var pause = false;

onkeydown = (event) => {
    if (event.code === 'Space') {
        pause = !pause;
        if (!pause) {
            window.requestAnimationFrame(update);
        }
    }
}