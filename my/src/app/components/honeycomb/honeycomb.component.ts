import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostListener,
    Renderer2,
} from '@angular/core';
import {
    AmbientLight,
    Clock,
    CylinderGeometry,
    DirectionalLight,
    InstancedMesh,
    Matrix4,
    MeshStandardMaterial,
    Object3D,
    PCFSoftShadowMap,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
} from 'three';

@Component({
    selector: 'app-honeycomb',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: 'honeycomb.component.html',
    styleUrls: ['honeycomb.component.scss'],
})
export class HoneycombComponent implements AfterViewInit {
    private static readonly HEXAGON_COLOR: number = 0x293d3d;

    private renderer: WebGLRenderer;
    private camera: PerspectiveCamera;
    private scene: Scene;

    private hexagonMesh: InstancedMesh;

    constructor(
        private readonly element: ElementRef,
        private readonly domRenderer: Renderer2
    ) {}

    ngAfterViewInit() {
        this.initializeRenderer();
        this.initializeCamera();
        this.initializeScene();
        this.renderLoop();
    }

    @HostListener('window:resize')
    onWindowResize() {
        const elementSize = this.getElementSize();

        this.camera.aspect = elementSize.width / elementSize.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(elementSize.width, elementSize.height);
    }

    private renderLoop() {
        if (!this.renderer) {
            return;
        }

        const clock = new Clock();
        this.renderer.setAnimationLoop(() => {
            const time = clock.getElapsedTime();

            const matrix = new Matrix4();

            const phases = this.hexagonMesh.userData['phases'];
            for (let i = 0; i < phases.length; i++) {
                const phase = phases[i];

                this.hexagonMesh.getMatrixAt(i, matrix);

                const dummy = new Object3D();
                matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                dummy.position.z = Math.sin(phase.depth + time) * 0.1;
                dummy.updateMatrix();

                this.hexagonMesh.setMatrixAt(i, dummy.matrix);
            }
            this.hexagonMesh.instanceMatrix.needsUpdate = true;

            this.renderer.setClearColor(0x000000);
            this.renderer.render(this.scene, this.camera);
        });
    }

    private initializeScene() {
        this.scene = new Scene();

        const light = new DirectionalLight(0xffffff, 0.5);
        light.position.set(80, 50, 50);
        light.castShadow = true;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 250;

        const cameraSize = 10;
        light.shadow.camera.left = -cameraSize;
        light.shadow.camera.bottom = -cameraSize;
        light.shadow.camera.right = cameraSize;
        light.shadow.camera.top = cameraSize;

        this.scene.add(light);
        this.scene.add(new AmbientLight(0xffffff, 0.5));

        this.generateHexagons();
        this.scene.add(this.hexagonMesh);
    }

    private setInstanceData(
        instancedMesh: InstancedMesh,
        instanceIndex: number,
        position: Vector3
    ) {
        const dummy = new Object3D();
        dummy.position.copy(position);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);

        instancedMesh.userData['phases'].push({
            depth: Math.random() * Math.PI * 2,
        });
    }

    private initializeRenderer() {
        const elementSize = this.getElementSize();

        this.renderer = new WebGLRenderer({ antialias: true });
        this.renderer.setSize(elementSize.width, elementSize.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFSoftShadowMap;

        this.domRenderer.appendChild(
            this.element.nativeElement,
            this.renderer.domElement
        );
    }

    private initializeCamera() {
        const elementSize = this.getElementSize();

        this.camera = new PerspectiveCamera(
            100,
            elementSize.width / elementSize.height,
            0.1,
            100
        );
        this.camera.position.set(0, 0, 3);
    }

    private getElementSize(): { width: number; height: number } {
        const rect = this.element.nativeElement.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }

    private generateHexagons() {
        const geometry = new CylinderGeometry(0.5, 0.5, 0.1, 6);
        geometry.rotateX(Math.PI * 0.5);
        const material = new MeshStandardMaterial({
            color: HoneycombComponent.HEXAGON_COLOR,
        });

        const circleCount = 10; // TODO Only render hexagons when inside the current screen? Like in a square!
        const instances = ((circleCount * (circleCount + 1)) / 2) * 6 + 1;
        const instancedMesh = new InstancedMesh(geometry, material, instances);
        instancedMesh.userData['phases'] = [];
        instancedMesh.receiveShadow = true;
        instancedMesh.castShadow = true;

        const angle = Math.PI / 3;
        const axis = new Vector3(0, 0, 1);

        const unit = Math.sqrt(3) * 0.5 * 1.025;
        const axisVector = new Vector3(0, -unit, 0);
        const sideVector = new Vector3(0, unit, 0).applyAxisAngle(axis, -angle);
        const tempVec = new Vector3();
        let instanceIndex = 0;
        for (let segment = 0; segment < 6; segment++) {
            for (let ax = 1; ax <= circleCount; ax++) {
                for (let side = 0; side < ax; side++) {
                    tempVec
                        .copy(axisVector)
                        .multiplyScalar(ax)
                        .addScaledVector(sideVector, side)
                        .applyAxisAngle(axis, angle * segment + Math.PI / 6);

                    this.setInstanceData(instancedMesh, instanceIndex, tempVec);

                    instanceIndex++;
                }
            }
        }

        // Set the central hexagon
        this.setInstanceData(instancedMesh, instanceIndex, new Vector3());

        this.hexagonMesh = instancedMesh;
    }
}
