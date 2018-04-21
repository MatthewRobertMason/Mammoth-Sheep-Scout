
function Game(container){
    this.container = container;
    this.container.css({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '500px',
        height: '400px'
    })

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    this.container.append(renderer.domElement)

    this.camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );
    this.scene = new THREE.Scene();

    this.scene.add(this.camera);

}
