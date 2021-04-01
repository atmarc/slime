attribute vec4 position;
attribute vec2 a_texcoord;

varying vec2 v_texcoord;

void main() {
    gl_Position = position;
    
    gl_PointSize = 1.0;
    // Pass the texcoord to the fragment shader.
    v_texcoord = a_texcoord;
}