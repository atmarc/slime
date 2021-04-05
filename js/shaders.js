// -----------------------------------------------------------------------------------------
// (prog 1) make diffusion on texture
// -----------------------------------------------------------------------------------------
const diffusion_vs = `
attribute vec4 position;
attribute vec2 a_texcoord;

varying vec2 v_texcoord;

void main() {
    gl_Position = position;

    // Pass the texcoord to the fragment shader.
    v_texcoord = a_texcoord;
}
`
// -----------------------------------------------------------------------------------------

const diffusion_fs = `
precision mediump float;

uniform sampler2D u_tex_prev;
uniform vec2 u_prev_tex_size;

// Passed in from the vertex shader.
varying vec2 v_texcoord;

bool pos_ok (in vec2 pos) {
    return pos.x >= 0. && pos.y >= 0. && pos.x < 1. && pos.y < 1.;
}

void main() {
    vec2 onePixel = vec2(1.0/u_prev_tex_size.x, 1.0/u_prev_tex_size.y);
    vec4 sum = vec4(0);
    for (float i = -1.; i <= 1.; ++i) {
        for (float j = -1.; j <= 1.; ++j) {
            vec2 tmp = vec2(v_texcoord.x + i*onePixel.x, v_texcoord.y + j*onePixel.y);
            if (pos_ok(tmp)) {
                sum += texture2D(u_tex_prev, tmp);
            }
        }
    }

    vec4 average = sum / 9.0;
    float diffusion = 0.003;
    average.x = max(0., average.x - diffusion);
    average.y = max(0., average.y - diffusion);
    average.z = max(0., average.z - diffusion);

    gl_FragColor = average;
}
`

// -----------------------------------------------------------------------------------------
// (prog 2) current_pos --(with old_text)--> new_positions
// -----------------------------------------------------------------------------------------
const compute_pos_vs = `
attribute vec4 position;
attribute vec2 a_texcoord;

varying vec2 v_texcoord;

void main() {
    gl_Position = position;
    // Pass the texcoord to the fragment shader.
    v_texcoord = a_texcoord;
}
`
// -----------------------------------------------------------------------------------------

const compute_pos_fs = `
precision mediump float;

uniform vec2 u_pos_tex_size;
uniform vec2 u_prev_tex_size;

uniform sampler2D u_tex_pos;
uniform sampler2D u_tex_prev;

// Passed in from the vertex shader.
varying vec2 v_texcoord;

void main() {
    vec2 onePixel = vec2(1.0/u_pos_tex_size.x, 1.0/u_pos_tex_size.y);
    
    vec4 agent_data = texture2D(u_tex_pos, v_texcoord);
    agent_data.x += onePixel.x;

    gl_FragColor = agent_data;
}

`
// -----------------------------------------------------------------------------------------
// (prog 3) old_text draw new_pos --> new_text
// -----------------------------------------------------------------------------------------
const draw_pos_vs = `
attribute float id;

uniform vec2 u_pos_tex_size;
uniform sampler2D u_tex_pos;

vec4 getValueFrom2DTextureAs1DArray(sampler2D tex, vec2 dimensions, float index) {
    float y = floor(index / dimensions.x);
    float x = mod(index, dimensions.x);
    vec2 texcoord = (vec2(x, y) + 0.5) / dimensions;
    return texture2D(tex, texcoord);
}

void main() {

    vec4 agent_data = getValueFrom2DTextureAs1DArray(u_tex_pos, u_pos_tex_size, id);
    gl_Position = vec4(agent_data.xy, 0, 1);
    
    gl_PointSize = 1.0;
}`

// -----------------------------------------------------------------------------------------

const draw_pos_fs = `
precision mediump float;

void main() {
        gl_FragColor = vec4(255,255,255,255);
}	
`

// -----------------------------------------------------------------------------------------
// (prog 4) new_text draw to screen
// -----------------------------------------------------------------------------------------
const draw_canvas_vs = `
attribute vec4 position;
attribute vec2 a_texcoord;

varying vec2 v_texcoord;

void main() {
    gl_Position = position;

    // Pass the texcoord to the fragment shader.
    v_texcoord = a_texcoord;
}
`
// -----------------------------------------------------------------------------------------

const draw_canvas_fs = `
precision mediump float;

uniform sampler2D u_tex_prev;

// Passed in from the vertex shader.
varying vec2 v_texcoord;

void main() {
    gl_FragColor = texture2D(u_tex_prev, v_texcoord);
}

`