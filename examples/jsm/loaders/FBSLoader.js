import {
	BufferAttribute,
	BufferGeometry,
	Group,
	Loader,
	Mesh,
	MeshStandardMaterial,
	Object3D,
	FileLoader,
	Scene,
	Color,
	Fog,
	FogExp2,
	Line,
	Points
} from "../../../build/three.module.js";
import { flatbuffers } from "../libs/flatbuffers/flatbuffers.module.js";
import { FBSCodec as fbs } from "../libs/flatbuffers/FBSCodec_generated.js";



class FBSLoader extends Loader {


	load( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );
		loader.load( url, function ( bytes ) {

			try {

				onLoad( scope.parse( bytes ) );

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );

			}

		}, onProgress, onError );

	}

	parse( bytes ) {

		this.cache = {
			objects: new Map(),
			geometries: new Map()
		};

		var buf = new flatbuffers.ByteBuffer( new Uint8Array( bytes ) );
		const root = fbs.Root.getRoot( buf );
		const object = this.parseObject(
			root.objectType(),
			root.object( new fbs[ fbs.ObjectName[ root.objectType() ] ]() )
		);
		this.cache = null;
		return object;


	}

	parseBufferAttribute( data ) {

	}

	parseBufferAttribute( data ) {

		// TODO handle clamped array
		const arrayData = data.array( new fbs[ fbs.TypedArrayName[ data.arrayType() ] ]() );
		const array = arrayData.dataArray();
		return new BufferAttribute(
			array,
			data.itemSize(),
			data.normalized()
		);

	}

	parseBufferGeometry( data ) {

		const geometry = new BufferGeometry();
		geometry.uuid = data.uuid();
		geometry.name = data.name() || '';

		for ( let i = 0; i < data.attributesLength(); i ++ ) {

			const att = data.attributes( i );
			const name = att.name();
			const attributeData = att.attribute();

			geometry.setAttribute( name, this.parseBufferAttribute( attributeData ) );

		}

		const indexData = data.index();

		if ( indexData ) {

			geometry.setIndex( this.parseBufferAttribute( indexData ) );

		}

		return geometry;

	}

	parseGeometry( data ) {

		if ( this.cache.geometries.has( data.uuid() ) ) {

			return this.cache.geometries.get( data.uuid() );

		}

		const geometry = this.parseBufferGeometry( data );
		this.cache.geometries.set( data.uuid(), geometry );
		return geometry;

	}

	parseObject( type, data ) {

		let object;

		switch ( type ) {

			case fbs.Object.Scene: {

				object = new Scene();

				if ( data.backgroundType() === fbs.Background.Color ) {

					const bg = data.background();
					object.background = new Color( bg.r, bg.g, bg.b );

				}

				if ( data.fogType() === fbs.FogUni.Fog ) {

					const fog = data.fog( new fbs.Fog() );
					const c = fog.color();

					object.fog = new Fog( new Color( c.r, c.g, c.b ), fog.near(), fog.far() );

				} else if ( data.fog.type === 'FogExp2' ) {

					const fog = data.fog( new fbs.FogExp2() );
					const c = fog.color();
					object.fog = new FogExp2( new Color( c.r, c.g, c.b ), fog.density() );

				}

				break;

			}



			// case 'PerspectiveCamera':

			// 	object = new PerspectiveCamera( data.fov, data.aspect, data.near, data.far );

			// 	if ( data.focus !== undefined ) object.focus = data.focus;
			// 	if ( data.zoom !== undefined ) object.zoom = data.zoom;
			// 	if ( data.filmGauge !== undefined ) object.filmGauge = data.filmGauge;
			// 	if ( data.filmOffset !== undefined ) object.filmOffset = data.filmOffset;
			// 	if ( data.view !== undefined ) object.view = Object.assign( {}, data.view );

			// 	break;

			// case 'OrthographicCamera':

			// 	object = new OrthographicCamera( data.left, data.right, data.top, data.bottom, data.near, data.far );

			// 	if ( data.zoom !== undefined ) object.zoom = data.zoom;
			// 	if ( data.view !== undefined ) object.view = Object.assign( {}, data.view );

			// 	break;

			// case 'AmbientLight':

			// 	object = new AmbientLight( data.color, data.intensity );

			// 	break;

			// case 'DirectionalLight':

			// 	object = new DirectionalLight( data.color, data.intensity );

			// 	break;

			// case 'PointLight':

			// 	object = new PointLight( data.color, data.intensity, data.distance, data.decay );

			// 	break;

			// case 'RectAreaLight':

			// 	object = new RectAreaLight( data.color, data.intensity, data.width, data.height );

			// 	break;

			// case 'SpotLight':

			// 	object = new SpotLight( data.color, data.intensity, data.distance, data.angle, data.penumbra, data.decay );

			// 	break;

			// case 'HemisphereLight':

			// 	object = new HemisphereLight( data.color, data.groundColor, data.intensity );

			// 	break;

			// case 'LightProbe':

			// 	object = new LightProbe().fromJSON( data );

			// 	break;

			// case 'SkinnedMesh':

			// 	console.warn( 'THREE.ObjectLoader.parseObject() does not support SkinnedMesh yet.' );

			case fbs.Object.Mesh: {

				const geometryData = data.geometry();
				const geometry = this.parseGeometry( geometryData );
				const material = new MeshStandardMaterial( {
					color: 0xff9e1b
				} );
				// material = this.parseMaterial( data.material );

				object = new Mesh( geometry, material );

				break;

			}

			case fbs.Object.Line: {

				const geometryData = data.geometry();
				const geometry = this.parseGeometry( geometryData );
				object = new Line( geometry );
				break;

			}

			case fbs.Object.Points: {

				const geometryData = data.geometry();
				const geometry = this.parseGeometry( geometryData );
				object = new Points( geometry );
				break;

			}




			// case 'InstancedMesh':

			// 	geometry = getGeometry( data.geometry );
			// 	material = getMaterial( data.material );
			// 	const count = data.count;
			// 	const instanceMatrix = data.instanceMatrix;

			// 	object = new InstancedMesh( geometry, material, count );
			// 	object.instanceMatrix = new BufferAttribute( new Float32Array( instanceMatrix.array ), 16 );

			// 	break;

			// case 'LOD':

			// 	object = new LOD();

			// 	break;



			// case 'LineLoop':

			// 	object = new LineLoop( getGeometry( data.geometry ), getMaterial( data.material ) );

			// 	break;

			// case 'LineSegments':

			// 	object = new LineSegments( getGeometry( data.geometry ), getMaterial( data.material ) );

			// 	break;

			// case 'PointCloud':
			// case 'Points':

			// 	object = new Points( getGeometry( data.geometry ), getMaterial( data.material ) );

			// 	break;

			// case 'Sprite':

			// 	object = new Sprite( getMaterial( data.material ) );

			// 	break;

			case fbs.Object.Group: {

				object = new Group();

				break;

			}



			case fbs.Object.Object3D: {

				object = new Object3D();
				break;

			}


			default: {

				console.warn( `FBSLoader: unsupported object type code (${type}) falling back to Object3D` );
				object = new Object3D();
				break;

			}



		}

		const base = type === fbs.Object.Object3D ? data : data._base_();

		object.uuid = base.uuid();
		if ( base.name() ) object.name = base.name();

		object.visible = base.visible();
		object.frustumCulled = base.frustumCulled();
		object.renderOrder = base.renderOrder();
		if ( base.userData() ) object.userData = base.userData();
		object.layers.mask = base.layers();

		object.castShadow = base.castShadow();
		object.receiveShadow = base.receiveShadow();

		const m = base.matrix();
		if ( m ) {

			object.matrix.set(
				m.n11(), m.n12(), m.n13(), m.n14(),
				m.n21(), m.n22(), m.n23(), m.n24(),
				m.n31(), m.n32(), m.n33(), m.n34(),
				m.n41(), m.n42(), m.n43(), m.n44()
			);
			object.matrixAutoUpdate = base.matrixAutoUpdate();
			if ( object.matrixAutoUpdate ) object.matrix.decompose( object.position, object.quaternion, object.scale );

		}


		if ( base.shadow ) {

			if ( data.shadow.bias !== undefined ) object.shadow.bias = data.shadow.bias;
			if ( data.shadow.normalBias !== undefined ) object.shadow.normalBias = data.shadow.normalBias;
			if ( data.shadow.radius !== undefined ) object.shadow.radius = data.shadow.radius;
			if ( data.shadow.mapSize !== undefined ) object.shadow.mapSize.fromArray( data.shadow.mapSize );
			if ( data.shadow.camera !== undefined ) object.shadow.camera = this.parseObject( data.shadow.camera );

		}


		for ( let i = 0; i < base.childrenLength(); i ++ ) {

			const type = base.childrenType( i );
			object.add( this.parseObject( type, base.children(
				i,
				new fbs[ fbs.ObjectName[ type ] ]()
			) ) );

		}

		if ( data.type === 'LOD' ) {

			if ( data.autoUpdate !== undefined ) object.autoUpdate = data.autoUpdate;

			const levels = data.levels;

			for ( let l = 0; l < levels.length; l ++ ) {

				const level = levels[ l ];
				const child = object.getObjectByProperty( 'uuid', level.object );

				if ( child !== undefined ) {

					object.addLevel( child, level.distance );

				}

			}

		}

		return object;

	}

}

export { FBSLoader };
