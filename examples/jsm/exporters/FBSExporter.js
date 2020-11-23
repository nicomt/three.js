import { flatbuffers } from "../libs/flatbuffers/flatbuffers.module.js";
import { FBSCodec as fbs } from "../libs/flatbuffers/FBSCodec_generated.js";

class FBSExporter {

	parse( input, onDone ) {

		const builder = new flatbuffers.Builder( 1024 );
		const cache = {
			objects: new Map(),
			geometries: new Map()
		};

		function processBufferAttribute( attribute ) {

			if ( ! attribute ) return;

			const arrayCodec = fbs[ attribute.array.constructor.name ];
			if ( arrayCodec ) {

				const dataOffset = arrayCodec.createDataVector( builder, attribute.array );
				arrayCodec.start( builder );
				arrayCodec.addData( builder, dataOffset );
				const arrayOffset = arrayCodec.end( builder );

				fbs.BufferAttribute.start( builder );
				fbs.BufferAttribute.addItemSize( builder, attribute.itemSize );
				fbs.BufferAttribute.addNormalized( builder, attribute.normalized );
				fbs.BufferAttribute.addArrayType( builder, fbs.TypedArray[ attribute.array.constructor.name ] );
				fbs.BufferAttribute.addArray( builder, arrayOffset );
				return fbs.BufferAttribute.end( builder );

			} else {

				console.warn( `THREE.FBSExporter: Attribute of type ${attribute.array.constructor.name} not supported.` );

			}

		}

		function processAttributes( attributes ) {

			const attributesOffsets = [];
			for ( const [ name, attribute ] of Object.entries( attributes ) ) {

				const bufAttributeOffset = processBufferAttribute( attribute );
				if ( bufAttributeOffset ) {

					const nameOffset = builder.createString( name );
					fbs.Attribute.start( builder );
					fbs.Attribute.addName( builder, nameOffset );
					fbs.Attribute.addAttribute( builder, bufAttributeOffset );
					attributesOffsets.push( fbs.Attribute.end( builder ) );

				}

			}

			return fbs.BufferGeometry.createAttributesVector( builder, attributesOffsets );

		}

		function processBufferGeometry( geometry ) {

			const uuidOffset = builder.createString( geometry.uuid );
			const nameOffset = builder.createString( geometry.name );
			const indexOffset = processBufferAttribute( geometry.index );
			const attributesOffset = processAttributes( geometry.attributes );

			fbs.BufferGeometry.start( builder );
			fbs.BufferGeometry.addUuid( builder, uuidOffset );
			fbs.BufferGeometry.addName( builder, nameOffset );
			fbs.BufferGeometry.addAttributes( builder, attributesOffset );
			if ( indexOffset ) fbs.BufferGeometry.addIndex( builder, indexOffset );

			return fbs.BufferGeometry.end( builder );

		}

		function processGeometry( geometry ) {

			if ( ! geometry ) return;

			if ( cache.geometries.has( geometry.uuid ) ) {

				return cache.geometries.get( geometry.uuid );

			}

			if ( geometry.isBufferGeometry ) {

				const geometryOffset = processBufferGeometry( geometry );
				cache.geometries.set(
					geometry.uuid,
					geometryOffset
				);
				return geometryOffset;

			}

		}

		// function parseMaterial( material ) {

		// }

		// function processObjectExt( object ) {

		// 	switch ( object.type ) {

		// 		case 'Scene':
		// 			if(object.backgroung)
		// 			codec.Scene.startScene(builder);
		// 			break;

		// 		default:
		// 			break;

		// 	}

		// }

		function processObjectBase( object ) {

			const uuidOffset = builder.createString( object.uuid );
			const nameOffset = builder.createString( object.name );
			const children = object.children
				.map( c => processObject( c ) )
				.filter( c => !! c );
			const childrenOffsets = fbs.Object3D.createChildrenVector(
				builder,
				children.map( c => c[ 1 ] )
			);
			const childrenTypesOffsets = fbs.Object3D.createChildrenTypeVector(
				builder,
				children.map( c => c[ 0 ] )
			);


			fbs.Object3D.start( builder );
			fbs.Object3D.addUuid( builder, uuidOffset );
			fbs.Object3D.addName( builder, nameOffset );
			fbs.Object3D.addCastShadow( builder, object.castShadow );
			fbs.Object3D.addReceiveShadow( builder, object.receiveShadow );
			fbs.Object3D.addFrustumCulled( builder, object.frustumCulled );
			fbs.Object3D.addRenderOrder( builder, object.renderOrder );
			fbs.Object3D.addMatrix( builder, fbs.Matrix4.create( builder, ...object.matrix.toArray() ) );
			fbs.Object3D.addLayers( builder, object.layers.mask );
			fbs.Object3D.addVisible( builder, object.visible );
			fbs.Object3D.addChildrenType( builder, childrenTypesOffsets );
			fbs.Object3D.addChildren( builder, childrenOffsets );
			return fbs.Object3D.end( builder );

		}

		function processObject( object ) {

			if ( cache.objects.has( object.uuid ) ) {

				return cache.objects.get( object.uuid );

			}

			if ( ! fbs.Object[ object.type ] ) return;



			const objectBaseOffset = processObjectBase( object );

			let res;

			switch ( object.type ) {

				case 'Scene': {

					fbs.Scene.start( builder );
					fbs.Scene.add_Base_( builder, objectBaseOffset );
					if ( object.background && object.background.isColor ) {

						fbs.Scene.addBackgroundType( builder, fbs.Background.Color );
						fbs.Scene.addBackground( builder, fbs.Color.create(
							builder,
							object.background.r,
							object.background.g,
							object.background.b
						) );

					}

					if ( object.fog && object.fog.isFog ) {

						fbs.Scene.addFogType( builder, fbs.FogUni.Fog );
						fbs.Scene.addFog( builder, fbs.Fog.create(
							builder,
							object.fog.color.r,
							object.fog.color.g,
							object.fog.color.b,
							object.fog.near,
							object.fog.far
						) );

					}

					if ( object.fog && object.fog.isFogExp2 ) {

						fbs.Scene.addFogType( builder, fbs.FogUni.FogExp2 );
						fbs.Scene.addFog( builder, fbs.FogExp2.create(
							builder,
							object.fog.color.r,
							object.fog.color.g,
							object.fog.color.b,
							object.fog.density
						) );

					}


					const sceneOffset = fbs.Scene.end( builder );
					res = [ fbs.Object.Scene, sceneOffset ];
					break;

				}

				case 'Mesh':
				case 'Line':
				case 'Points': {

					const geometryOffset = processGeometry( object.geometry );
					// const material = parseMaterial( object.material );
					const objCodec = fbs[ object.type ];
					objCodec.start( builder );
					objCodec.add_Base_( builder, objectBaseOffset );
					objCodec.addGeometry( builder, geometryOffset );
					const objOffset = objCodec.end( builder );
					res = [ fbs.Object[ object.type ], objOffset ];
					break;


				}

				case 'Object3D': {

					res = [ fbs.Object.Object3D, objectBaseOffset ];
					break;

				}

				default: {

					const objCodec = fbs[ object.type ];

					if ( ! objCodec ) {

						console.warn( `FBSExporter: Object type not supported ${object.type}` );
						return;

					}

					objCodec.start( builder );
					objCodec.add_Base_( builder, objectBaseOffset );
					const objectOffset = objCodec.end( builder );
					res = [ fbs.Object[ object.type ], objectOffset ];
					break;

				}

			}

			cache.objects.set( object.uuid, res );
			return res;

		}

		const [ objType, objOffset ] = processObject( input );
		const generatorOffset = builder.createString( 'FBSExporter' );
		fbs.Metadata.start( builder );
		fbs.Metadata.addVersion( builder, 1.0 );
		fbs.Metadata.addGenerator( builder, generatorOffset );
		const metadataOffset = fbs.Metadata.end( builder );

		fbs.Root.start( builder );
		fbs.Root.addMetadata( builder, metadataOffset );
		fbs.Root.addObjectType( builder, objType );
		fbs.Root.addObject( builder, objOffset );
		const rootOffset = fbs.Root.end( builder );
		builder.finish( rootOffset );
		onDone( builder.asUint8Array() );

	}

}

export { FBSExporter };
