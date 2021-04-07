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

void main() {
    vec2 onePixel = vec2(1.0/u_prev_tex_size.x, 1.0/u_prev_tex_size.y);
    vec4 sum = vec4(0);
    for (float i = -1.; i <= 1.; ++i) {
        for (float j = -1.; j <= 1.; ++j) {
            vec2 tmp = vec2(v_texcoord.x + i*onePixel.x, v_texcoord.y + j*onePixel.y);
            sum += texture2D(u_tex_prev, tmp);
        }
    }

    vec4 average = sum / 9.0;
    float diffusion = 0.02;
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

void main() {
    gl_Position = position;
}
`
// -----------------------------------------------------------------------------------------

const compute_pos_fs = `
precision mediump float;

uniform sampler2D u_tex_pos;
uniform sampler2D u_tex_prev;
uniform sampler2D u_tex_rand;

uniform vec2 u_prev_tex_size;
uniform vec2 u_pos_tex_size;

uniform float time;
uniform float VIEW_LEN;
uniform float VEL;
uniform float TURN_ANGLE;

#define PI 3.1415926535897932384626433832795
    
bool pos_ok (in float x, in float y) {
    return x > -1. && y > -1. && x < 1. && y < 1.;
}

bool tex_pos_ok (vec2 p) {
    return p.x >= 0. && p.y >= 0. && p.x < 1. && p.y < 1.;
}

void main() {
    vec2 texcoord = gl_FragCoord.xy / u_pos_tex_size;

    vec2 onePixel = 1./u_prev_tex_size;
    vec4 agent_data = texture2D(u_tex_pos, texcoord);

    float x = (agent_data.x + 1.)/2.;
    float y = (agent_data.y + 1.)/2.;
    float angle = agent_data.z;
    
    vec4 rand_tex_val = texture2D(u_tex_rand, vec2(x, y));

    float rand_val1 = mod(time + texcoord.x + texcoord.y + rand_tex_val.x, 1.);
    float rand_val2 = mod(time + texcoord.x + rand_tex_val.y, 1.);
    float rand_val3 = mod(time + texcoord.y + rand_tex_val.z, 1.);

    float x1 = x + VIEW_LEN * onePixel.x * cos(angle);
    float y1 = y + VIEW_LEN * onePixel.y * sin(angle);
    vec2 pos1 = vec2(x1, y1);
    float center = texture2D(u_tex_prev, pos1).x;

    float x2 = x + VIEW_LEN * onePixel.x * cos(angle - TURN_ANGLE);
    float y2 = y + VIEW_LEN * onePixel.y * sin(angle - TURN_ANGLE);
    vec2 pos2 = vec2(x2, y2);
    float left = texture2D(u_tex_prev, pos2).x;

    float x3 = x + VIEW_LEN * onePixel.x * cos(angle + TURN_ANGLE);
    float y3 = y + VIEW_LEN * onePixel.y * sin(angle + TURN_ANGLE);
    vec2 pos3 = vec2(x3, y3);
    float right = texture2D(u_tex_prev, pos3).x;

    float add_angle = 0.0;
    if (center > left && center > right) {
        add_angle = 0.0;
    }
    else if (left > center && right > center) {
        add_angle = TURN_ANGLE;
        if (rand_val1 > 0.5) add_angle = -TURN_ANGLE;
    }
    else if (right > left) {
        add_angle = TURN_ANGLE;
    }
    else if (left > right) {
        add_angle = -TURN_ANGLE;
    }

    add_angle *= rand_val2;

    float new_angle = angle + add_angle;
    float new_x = agent_data.x + cos(new_angle) * onePixel.x * VEL;
    float new_y = agent_data.y + sin(new_angle) * onePixel.y * VEL;
    
    if (pos_ok(new_x, new_y)) {
        gl_FragColor = vec4(new_x, new_y, new_angle, 1);
    }
    else {
        // Bounce
        if (new_x <= -1.) new_angle = PI/2. - PI * rand_val3;
        else if (new_x >= 1.) new_angle = PI/2. + PI * rand_val3;
        else if (new_y <= -1.) new_angle = PI - PI * rand_val3;
        else if (new_y >= 1.) new_angle = PI + PI * rand_val3;

        gl_FragColor = vec4(agent_data.xy, new_angle, 1);
    }
}

`
// -----------------------------------------------------------------------------------------
// (prog 3) old_text draw new_pos --> new_text
// -----------------------------------------------------------------------------------------
const draw_pos_vs = `
attribute float id;

uniform vec2 u_pos_tex_size;
uniform sampler2D u_tex_pos;

varying float v_id;

vec4 getValueFrom2DTextureAs1DArray(sampler2D tex, vec2 dimensions, float index) {
    float y = floor(index / dimensions.x);
    float x = mod(index, dimensions.x);
    vec2 texcoord = (vec2(x, y) + 0.5) / dimensions;
    return texture2D(tex, texcoord);
}

void main() {

    vec4 agent_data = getValueFrom2DTextureAs1DArray(u_tex_pos, u_pos_tex_size, id);
    gl_Position = vec4(agent_data.xy, 0, 1);
    v_id = id;
    gl_PointSize = 1.0;
}`

// -----------------------------------------------------------------------------------------

const draw_pos_fs = `
precision mediump float;
varying float v_id;

void main() {
        gl_FragColor = vec4(1,1,1,1);
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