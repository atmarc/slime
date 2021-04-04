precision mediump float;

uniform vec2 u_textureSize;
uniform sampler2D u_texture;
uniform int u_prerender;

// Passed in from the vertex shader.
varying vec2 v_texcoord;

bool pos_ok (in vec2 pos) {
    return pos.x >= 0. && pos.y >= 0. && pos.x < 1. && pos.y < 1.;
}

void main() {
    // Drawing dots
    if (u_prerender == 1) {
        gl_FragColor = vec4(255,255,255,255);
    }

    // Drawing to canvas
    else if (u_prerender == 2) {
        gl_FragColor = texture2D(u_texture, v_texcoord);
    }
    
    // Drawing to texture
    else {
        vec2 onePixel = vec2(1.0/u_textureSize.x, 1.0/u_textureSize.y);
        vec4 sum = vec4(0);
        float not_ok = 0.;
        for (float i = -1.; i <= 1.; ++i) {
            for (float j = -1.; j <= 1.; ++j) {
                vec2 tmp = vec2(v_texcoord.x + i*onePixel.x, v_texcoord.y + j*onePixel.y);
                if (pos_ok(tmp)) {
                    sum += texture2D(u_texture, tmp);
                } else {
                    ++not_ok;
                }
            }
        }

        vec4 average = sum / (9.0 - not_ok);
        float diffusion = 0.003;
        average.x = max(0., average.x - diffusion);
        average.y = max(0., average.y - diffusion);
        average.z = max(0., average.z - diffusion);

        gl_FragColor = average;
    }
}	
