var canvas = document.querySelector("canvas");
var gl = canvas.getContext("webgl");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// setup GLSL program
var program = null;

fetch("fragment_shader.glsl")
.then(res => res.text())
.then(frag => {
    fetch("vertex_shader.glsl")
    .then(res => res.text())
    .then(vert => {
        program = webglUtils.createProgramFromSources(gl, [vert, frag]);
        main();
    })
})

var agents_positions = [];
var tex1 = null;
function main () {
    var positionLocation = gl.getAttribLocation(program, "position");
    var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

    // we don't need to look up the texture's uniform location because
    // we're only using 1 texture. Since the uniforms default to 0
    // it will use texture 0.
    var textureSizeLocation = gl.getUniformLocation(program, "u_textureSize");
    var prerenderLocation = gl.getUniformLocation(program, "u_prerender");
    
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
    gl.enableVertexAttribArray(texcoordLocation);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    // put in a clipspace quad
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


    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // make textures 
    var init_mat = new Array(canvas.height * canvas.width * 4);
    for (let i = 0; i < init_mat.length; i += 4) {
        // if (Math.random() <= 0.001) {
        //     init_mat[i] = 255;
        //     init_mat[i + 1] = 255;
        //     init_mat[i + 2] = 255;
        //     init_mat[i + 3] = 255;
        // }
        // else {
            init_mat[i] = 0;
            init_mat[i + 1] = 0;
            init_mat[i + 2] = 0;
            init_mat[i + 3] = 255;
        // }
    }

    tex1 = gl.createTexture();
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

    var frame = 0;
    var t0 = performance.now();
    
    // Create a buffer to put positions in
    var positionBuffer = gl.createBuffer();

    var n_agents = 1000;
    for (let i = 0; i < n_agents; ++i) {
        agents_positions.push(Math.random() * 2 - 1, Math.random() * 2 - 1);
    }

    var fb_pixels = gl.createFramebuffer();
    
    function read_pixel(x, y) {
        var pixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels;    
    }

    function update_points() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb_pixels);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);

        for (let i = 0; i < agents_positions.length; i += 2) {
            let x = ((agents_positions[i] + 1) / 2) * gl.canvas.width;
            let y = (agents_positions[i + 1] + 1) / 2 * gl.canvas.height;
            // TODO: fer sensors i tal amb read_pixel
        }   
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function render() {
        update_points();
        
        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // Clear the canvas.
        // gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        
        // -------------------------- Draw to texture --------------------------
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

        // for (let i = 0; i < agents_positions.length; i += 2) agents_positions[i] += 0.001;

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
                window.requestAnimationFrame(render);
            }
        }
    })

}