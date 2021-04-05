var canvas = document.querySelector("canvas");
var gl = canvas.getContext("webgl");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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
    texcoord: gl.getAttribLocation(program2, "a_texcoord"),
    prevTex: gl.getUniformLocation(program2, "u_tex_prev"),
    posTex: gl.getUniformLocation(program2, "u_tex_pos"),
    posTexSize: gl.getUniformLocation(program2, "u_pos_tex_size"),
    prevTexSize: gl.getUniformLocation(program2, "u_prev_tex_size")
}

// -----------------------------------------------------------------------------------------
// (prog 3) old_text draw new_pos --> new_text
// -----------------------------------------------------------------------------------------
var program3 = webglUtils.createProgramFromSources(gl, [draw_pos_vs, draw_pos_fs]);
var prog3Locations = {
    position: gl.getAttribLocation(program3, "id"),
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
var posTexHeight = 10;
var posTexWidth = 10;
var n_agents = posTexHeight * posTexWidth;

var pos_tex_data = new Array(n_agents * 4);
for (let i = 0; i < pos_tex_data.length; i += 4) {
    pos_tex_data[i] = Math.random() * 2 - 1;            // x coord
    pos_tex_data[i + 1] = Math.random() * 2 - 1;        // y coord
    pos_tex_data[i + 2] = Math.PI * 2 * Math.random();  // angle
    pos_tex_data[i + 3] = 0;
}

var pos_tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, pos_tex);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, posTexWidth, posTexHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pos_tex_data));

// -----------------------------------------------------------------------------------------
// Make canvas sized textures and framebuffers
// -----------------------------------------------------------------------------------------
var init_mat = new Array(canvas.height * canvas.width * 4);
for (let i = 0; i < init_mat.length; i += 4) {
    init_mat[i] = 0;
    init_mat[i + 1] = 0;
    init_mat[i + 2] = 0;
    init_mat[i + 3] = 255;
}

var tex1 = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex1);

// Set the parameters so we can render any size image.
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(init_mat));

var tex2 = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex2);

// Set the parameters so we can render any size image.
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

// make a framebuffer for tex1
var fb1 = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fb1);

// attach tex1
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);
// check this will actually work
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    alert("this combination of attachments not supported");
}

// make a framebuffer for tex2
var fb2 = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
// attach tex2
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex2, 0);
// check this will actually work
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    alert("this combination of attachments not supported");
}

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
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // -------------------------- Program 1 --------------------------
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, canvasPositionBuffer);        
        
    // set the uniforms
    gl.uniform2f(textureSizeLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1i(prerenderLocation, 0);
    
    // input to fragment shader
    gl.bindTexture(gl.TEXTURE_2D, tex1);

    // output from fragment shader
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
    
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    gl.drawArrays(gl.TRIANGLES, 0, 6);


    // -------------------------- Draw dots --------------------------
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(agents_positions), gl.STATIC_DRAW);
    
    gl.uniform1i(prerenderLocation, 1);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    // Draw the points
    gl.drawArrays(gl.POINTS, 0, agents_positions.length / 2);

    // -------------------------- Draw to canvas --------------------------
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, canvasPositionBuffer);        

    gl.uniform1i(prerenderLocation, 2);

    // render to canvas so we can see it
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // input to fragment shader, the texture we just rendered to
    gl.bindTexture(gl.TEXTURE_2D, tex2);

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // -------------------------- Swap the textures --------------------------
    // swap which texture we are rendering from and to
    var t = tex1;
    tex1 = tex2;
    tex2 = t;

    var f = fb1;
    fb1 = fb2;
    fb2 = f;

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

