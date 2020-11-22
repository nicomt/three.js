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
	Color
} from "../../../build/three.module.js";
import { flatbuffers } from "../libs/flatbuffers/flatbuffers.module.js";
import { FBSCodec as codec } from "../libs/flatbuffers/FBSCodec_generated.js";



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

		var buf = new flatbuffers.ByteBuffer( new Uint8Array( bytes ) );
		const rootObj = codec.Object.getRootAsObject( buf );

		return this.parseObject( rootObj );

	}

	parseGeometry( objData ) {

		const data = objData.geometry( new codec.BufferGeometry() );
		const geometry = new BufferGeometry();
		geometry.uuid = data.uuid();
		geometry.name = data.name();

		for ( let i = 0; i < data.attributesLength(); i ++ ) {

			const att = data.attributes( i );
			const name = att.name();
			const attribute = att.attribute( new codec.Float32BufferAttribute() );
			const array = new Float32Array( attribute.arrayLength() );
			for ( let j = 0; j < attribute.arrayLength(); j ++ ) {

				array[ j ] = attribute.array( j );

			}

			const bufferAttribute = new BufferAttribute(
				array,
				attribute.itemSize(),
				attribute.normalized()
			);
			geometry.setAttribute( name, bufferAttribute );

		}

		if ( data.indexType() !== codec.BufferGeometryIndex.NONE ) {

			let index, array;

			if ( data.indexType() === codec.BufferGeometryIndex.Uint16BufferGeometryIndex ) {

				index = data.index( new codec.Uint16BufferGeometryIndex() );
				array = new Uint16Array( index.arrayLength() );

			} else {

				index = data.index( new codec.Uint32BufferGeometryIndex() );
				array = new Uint32Array( index.arrayLength() );

			}

			for ( let i = 0; i < index.arrayLength(); i ++ ) {

				array[ i ] = index.array( i );

			}

			geometry.setIndex( new BufferAttribute( array, 1 ) );

		}

		return geometry;

	}

	parseObject( data ) {

		let object;

		switch ( data.type() ) {

			case 'Scene':

				object = new Scene();

				if ( data.background !== undefined ) {

					if ( Number.isInteger( data.background ) ) {

						object.background = new Color( data.background );

					}

				}

				if ( data.fog !== undefined ) {

					if ( data.fog.type === 'Fog' ) {

						object.fog = new Fog( data.fog.color, data.fog.near, data.fog.far );

					} else if ( data.fog.type === 'FogExp2' ) {

						object.fog = new FogExp2( data.fog.color, data.fog.density );

					}

				}

				break;

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

			case 'Mesh':

				const geometry = this.parseGeometry( data );
				const material = new MeshStandardMaterial();
				// material = this.parseMaterial( data.material );

				object = new Mesh( geometry, material );

				break;

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

				// case 'Line':

				// 	object = new Line( getGeometry( data.geometry ), getMaterial( data.material ), data.mode );

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

			case 'Group':

				object = new Group();

				break;

			default:

				object = new Object3D();

		}

		object.uuid = data.uuid();
		object.name = data.name();

		object.visible = data.visible();
		object.frustumCulled = data.frustumCulled();
		object.renderOrder = data.renderOrder();
		object.userData = data.userData();
		object.layers.mask = data.layers();

		object.castShadow = data.castShadow();
		object.receiveShadow = data.receiveShadow();

		const m = data.matrix();
		if ( m ) {

			object.matrix.set(
				m.n11(), m.n12(), m.n13(), m.n14(),
				m.n21(), m.n22(), m.n23(), m.n24(),
				m.n31(), m.n32(), m.n33(), m.n34(),
				m.n41(), m.n42(), m.n43(), m.n44()
			);
			object.matrixAutoUpdate = data.matrixAutoUpdate();
			if ( object.matrixAutoUpdate ) object.matrix.decompose( object.position, object.quaternion, object.scale );

		}


		if ( data.shadow ) {

			if ( data.shadow.bias !== undefined ) object.shadow.bias = data.shadow.bias;
			if ( data.shadow.normalBias !== undefined ) object.shadow.normalBias = data.shadow.normalBias;
			if ( data.shadow.radius !== undefined ) object.shadow.radius = data.shadow.radius;
			if ( data.shadow.mapSize !== undefined ) object.shadow.mapSize.fromArray( data.shadow.mapSize );
			if ( data.shadow.camera !== undefined ) object.shadow.camera = this.parseObject( data.shadow.camera );

		}



		if ( data.childrenLength() > 0 ) {

			for ( let i = 0; i < data.childrenLength(); i ++ ) {

				object.add( this.parseObject( data.children( i ) ) );

			}

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
