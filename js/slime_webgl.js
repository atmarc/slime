var canvas = document.querySelector("canvas");
var gl = canvas.getContext("webgl");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var parameters = {
    VEL: 3.0,
    VIEW_LEN: 10.0,
    TURN_ANGLE: Math.PI/4,
}

function updateParameter(value, paramName) {
    parameters[paramName] = value;
    console.log('Value of ' + paramName + ':', value);
}

var posTexHeight = 1000;
var posTexWidth = 1000;
var n_agents = posTexHeight * posTexWidth;
console.log('Number of agents:', n_agents);


// -----------------------------------------------------------------------------------------
// (prog 1) make diffusion on texture
// -----------------------------------------------------------------------------------------

var program1 = webglUtils.createProgramFromSources(gl, [diffusion_vs, diffusion_fs]);

var prog1Locations = {
    position: gl.getAttribLocation(program1, "position"),
    texcoord: gl.getAttribLocation(program1, "a_texcoord"),
    prevTex: gl.getUniformLocation(program1, "u_tex_prev"),
    prevTexSize: gl.getUniformLocation(program1, "u_prev_tex_size")
}


// -----------------------------------------------------------------------------------------
// (prog 2) current_pos --(with old_text)--> new_positions
// -----------------------------------------------------------------------------------------
var program2 = webglUtils.createProgramFromSources(gl, [compute_pos_vs, compute_pos_fs]);
var prog2Locations = {
    position: gl.getAttribLocation(program2, "position"),
    time: gl.getUniformLocation(program2, "time"),
    vel: gl.getUniformLocation(program2, "VEL"),
    view_len: gl.getUniformLocation(program2, "VIEW_LEN"),
    turn_angle: gl.getUniformLocation(program2, "TURN_ANGLE"),
    prevTex: gl.getUniformLocation(program2, "u_tex_prev"),
    posTex: gl.getUniformLocation(program2, "u_tex_pos"),
    randTex: gl.getUniformLocation(program2, "u_tex_rand"),
    posTexSize: gl.getUniformLocation(program2, "u_pos_tex_size"),
    prevTexSize: gl.getUniformLocation(program2, "u_prev_tex_size")
}

// -----------------------------------------------------------------------------------------
// (prog 3) old_text draw new_pos --> new_text
// -----------------------------------------------------------------------------------------
var program3 = webglUtils.createProgramFromSources(gl, [draw_pos_vs, draw_pos_fs]);
var prog3Locations = {
    ids: gl.getAttribLocation(program3, "id"),
    posTex: gl.getUniformLocation(program3, "u_tex_pos"),
    posTexSize: gl.getUniformLocation(program3, "u_pos_tex_size")
}

// -----------------------------------------------------------------------------------------
// (prog 4) new_text draw to screen
// -----------------------------------------------------------------------------------------
var program4 = webglUtils.createProgramFromSources(gl, [draw_canvas_vs, draw_canvas_fs]);
var prog4Locations = {
    position: gl.getAttribLocation(program4, "position"),
    texcoord: gl.getAttribLocation(program4, "a_texcoord"),
    prevTex: gl.getUniformLocation(program4, "u_tex_prev")
}

// -----------------------------------------------------------------------------------------
// Init position texture
// -----------------------------------------------------------------------------------------
function createTexture(gl, data, width, height, type) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

function createFramebuffer(gl, tex) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return fb;
}

// check we can use floating point textures
const ext1 = gl.getExtension('OES_texture_float');
if (!ext1) {
  alert('Need OES_texture_float');
}
// check we can render to floating point textures
const ext2 = gl.getExtension('WEBGL_color_buffer_float');
if (!ext2) {
  alert('Need WEBGL_color_buffer_float');
}
// check we can use textures in a vertex shader
if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
  alert('Can not use textures in vertex shaders');
}


// Init particles positions
var pos_tex_data = new Array(n_agents * 4);
for (let i = 0; i < pos_tex_data.length; i += 4) {
    let R = 0.7;
    let r = R * Math.sqrt(Math.random());
    let theta = Math.random() * 2 * Math.PI;

    let x = r * Math.cos(theta);
    let y = r * Math.sin(theta);

    pos_tex_data[i] = x;                                // x coord
    pos_tex_data[i + 1] = y;                            // y coord
    if (theta == 0) theta = Math.PI;
    pos_tex_data[i + 2] = -theta;  // angle
    pos_tex_data[i + 3] = 0;
}

var positionTex1 = createTexture(gl, new Float32Array(pos_tex_data), posTexWidth, posTexHeight, gl.FLOAT);
var positionTex2 = createTexture(gl, null, posTexWidth, posTexHeight, gl.FLOAT);

var positionsFB1 = createFramebuffer(gl, positionTex1);
var positionsFB2 = createFramebuffer(gl, positionTex2);

// -----------------------------------------------------------------------------------------
// Make canvas sized textures and framebuffers
// -----------------------------------------------------------------------------------------
var init_mat = new Array(gl.canvas.height * gl.canvas.width * 4);
for (let i = 0; i < init_mat.length; i += 4) {
    init_mat[i] = 0;
    init_mat[i + 1] = 0;
    init_mat[i + 2] = 0;
    init_mat[i + 3] = 255;
}

var tex1 = createTexture(gl, new Uint8Array(init_mat), gl.canvas.width, gl.canvas.height,  gl.UNSIGNED_BYTE);
var tex2 = createTexture(gl, null, gl.canvas.width, gl.canvas.height,  gl.UNSIGNED_BYTE);

// make a framebuffer for tex1
var fb1 = createFramebuffer(gl, tex1);
var fb2 = createFramebuffer(gl, tex2);
// -----------------------------------------------------------------------------------------
// Make noise texture
// -----------------------------------------------------------------------------------------
var noiseData = new Array(canvas.height * canvas.width * 4);
for (let i = 0; i < noiseData.length; ++i) noiseData[i] = Math.random();
var randTex = createTexture(gl, new Float32Array(noiseData), gl.canvas.width, gl.canvas.height,  gl.FLOAT);

// -----------------------------------------------------------------------------------------
// Make data buffers
// -----------------------------------------------------------------------------------------
// provide texture coordinates for the rectangle.
var texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0.0,  0.0,
    1.0,  0.0,
    0.0,  1.0,
    0.0,  1.0,
    1.0,  0.0,
    1.0,  1.0]), gl.STATIC_DRAW);

// Rectangle made with two triangles to print texture
var canvasPositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, canvasPositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
]), gl.STATIC_DRAW);


const ids = new Array(n_agents).fill(0).map((_, i) => i);
const idBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, idBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ids), gl.STATIC_DRAW);

// -----------------------------------------------------------------------------------------

var frame = 0;
var t0 = performance.now();

function render() {
    
    // Tell WebGL how to convert from clip space to pixels
    // -----------------------------------------------------------------------------------------
    // (prog 1) make diffusion on texture
    // -----------------------------------------------------------------------------------------

    gl.useProgram(program1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, canvasPositionBuffer);
    gl.vertexAttribPointer(prog1Locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog1Locations.position);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(prog1Locations.texcoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog1Locations.texcoord);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex1);

    gl.uniform1i(prog1Locations.prevTex, 0);  
    gl.uniform2f(prog1Locations.prevTexSize, gl.canvas.width, gl.canvas.height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // -----------------------------------------------------------------------------------------
    // (prog 2) current_pos --(with old_text)--> new_positions
    // -----------------------------------------------------------------------------------------
    
    gl.useProgram(program2);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, positionsFB2);
    gl.viewport(0, 0, posTexWidth, posTexHeight);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, canvasPositionBuffer);
    gl.vertexAttribPointer(prog2Locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog2Locations.position);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, positionTex1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, randTex);

    // set the uniforms
    gl.uniform1i(prog2Locations.prevTex, 0);  
    gl.uniform1i(prog2Locations.posTex, 1);  
    gl.uniform1i(prog2Locations.randTex, 2);  
    gl.uniform1f(prog2Locations.time, performance.now());  
    gl.uniform1f(prog2Locations.vel, parameters.VEL);  
    gl.uniform1f(prog2Locations.view_len, parameters.VIEW_LEN);  
    gl.uniform1f(prog2Locations.turn_angle, parameters.TURN_ANGLE);  
    gl.uniform2f(prog2Locations.prevTexSize, gl.canvas.width, gl.canvas.height);
    gl.uniform2f(prog2Locations.posTexSize, posTexWidth, posTexHeight);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // -----------------------------------------------------------------------------------------
    // (prog 3) old_text draw new_pos --> new_text
    // -----------------------------------------------------------------------------------------

    gl.useProgram(program3);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);

    gl.bindBuffer(gl.ARRAY_BUFFER, idBuffer);        
    gl.vertexAttribPointer(prog3Locations.ids, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog3Locations.ids);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, positionTex2);        

    gl.uniform1i(prog3Locations.posTex, 0);  
    gl.uniform2f(prog3Locations.posTexSize, posTexWidth, posTexHeight);

    gl.drawArrays(gl.POINTS, 0, n_agents);

    // -----------------------------------------------------------------------------------------
    // (prog 4) new_text draw to screen
    // -----------------------------------------------------------------------------------------

    gl.useProgram(program4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, canvasPositionBuffer);
    gl.vertexAttribPointer(prog4Locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog4Locations.position);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(prog4Locations.texcoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(prog4Locations.texcoord);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex2);

   
    gl.uniform1i(prog4Locations.prevTex, 0);  

    gl.drawArrays(gl.TRIANGLES, 0, 6);


    // -------------------------- Swap the textures --------------------------
    // swap which texture we are rendering from and to
    [tex1, tex2] = [tex2, tex1];
    [fb1, fb2] = [fb2, fb1];
    [positionTex1, positionTex2] = [positionTex2, positionTex1];
    [positionsFB1, positionsFB2] = [positionsFB2, positionsFB1];

    // ------------------------------ Compute fps ------------------------------
    if (frame % 100 == 0) {
        let t1 = performance.now();
        let dt = (t1 - t0) / 1000;
        let fps = parseInt(frame / dt);
        console.log(fps + ' fps');
        frame = 0;
        t0 = t1;
    }
    ++frame;
    
    if (!pause) window.requestAnimationFrame(render);
}

window.requestAnimationFrame(render);

var pause = false;
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        pause = !pause;
        if (!pause) {
            console.log('play')
            window.requestAnimationFrame(render);
        }
        else {
            console.log('pause')
        }
    }
})

