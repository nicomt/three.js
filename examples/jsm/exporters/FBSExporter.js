import { flatbuffers } from "../libs/flatbuffers/flatbuffers.module.js";
import { FBSCodec as codec } from "../libs/flatbuffers/FBSCodec_generated.js";

class FBSExporter {

	parse( input, onDone ) {

		const builder = new flatbuffers.Builder( 1024 );
		const cache = {
			objects: new Map(),
			geometries: new Map()
		};

		function processIndex( index ) {

			if ( index ) {

				if ( index.array.constructor.name === 'Uint16Array' ) {

					const array = codec.Uint16BufferGeometryIndex.createArrayVector( builder, index.array );
					codec.Uint16BufferGeometryIndex.startUint16BufferGeometryIndex( builder );
					codec.Uint16BufferGeometryIndex.addArray( builder, array );
					const idxOffset = codec.Uint16BufferGeometryIndex.endUint16BufferGeometryIndex( builder );
					return {
						type: codec.BufferGeometryIndex.Uint16BufferGeometryIndex,
						index: idxOffset
					};

				} else {

					const array = codec.Uint32BufferGeometryIndex.createArrayVector( builder, index.array );
					codec.Uint32BufferGeometryIndex.startUint32BufferGeometryIndex( builder );
					codec.Uint32BufferGeometryIndex.addArray( builder, array );
					const idxOffset = codec.Uint32BufferGeometryIndex.endUint32BufferGeometryIndex( builder );
					return {
						type: codec.BufferGeometryIndex.Uint32BufferGeometryIndex,
						index: idxOffset
					};

				}

			}

		}

		function processAttributes( attributes ) {

			const attributesOffsets = [];
			for ( const [ name, attribute ] of Object.entries( attributes ) ) {

				let attributeType, attributeIdx;
				const nameIdx = builder.createString( name );
				switch ( attribute.array.constructor.name ) {

					default:
						const array = codec.Float32BufferAttribute.createArrayVector( builder, attribute.array );
						codec.Float32BufferAttribute.startFloat32BufferAttribute( builder );
						codec.Float32BufferAttribute.addItemSize( builder, attribute.itemSize );
						codec.Float32BufferAttribute.addNormalized( builder, attribute.normalized );
						codec.Float32BufferAttribute.addArray( builder, array );
						attributeType = codec.BufferAttribute.Float32BufferAttribute;
						attributeIdx = codec.Float32BufferAttribute.endFloat32BufferAttribute( builder );
						break;

				}

				codec.Attribute.startAttribute( builder );
				codec.Attribute.addName( builder, nameIdx );
				codec.Attribute.addAttributeType( builder, attributeType );
				codec.Attribute.addAttribute( builder, attributeIdx );

				attributesOffsets.push( codec.Attribute.endAttribute( builder ) );

			}

			return codec.BufferGeometry.createAttributesVector( builder, attributesOffsets );

		}

		function processBufferGeometry( geometry ) {

			const uuid = builder.createString( geometry.uuid );
			const name = builder.createString( geometry.name );
			const index = processIndex( geometry.index );
			const attributes = processAttributes( geometry.attributes );

			codec.BufferGeometry.startBufferGeometry( builder );
			codec.BufferGeometry.addUuid( builder, uuid );
			codec.BufferGeometry.addName( builder, name );
			codec.BufferGeometry.addAttributes( builder, attributes );
			if ( index ) {

				codec.BufferGeometry.addIndexType( builder, index.type );
				codec.BufferGeometry.addIndex( builder, index.index );

			}

			return codec.BufferGeometry.endBufferGeometry( builder );

		}

		function processGeometry( geometry ) {

			if ( geometry ) {

				if ( cache.geometries.has( geometry.uuid ) ) {

					return cache.geometries.get( geometry.uuid );

				}

				if ( geometry.isBufferGeometry ) {

					cache.geometries.set( geometry.uuid, {
						type: codec.Geometry.BufferGeometry,
						geometry: processBufferGeometry( geometry )
					} );

				}

				return cache.geometries.get( geometry.uuid );

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

		function processObject( object ) {

			if ( cache.objects.has( object.uuid ) ) {

				return cache.objects.get( object.uuid );

			}

			const uuid = builder.createString( object.uuid );
			const name = builder.createString( object.name );
			const type = builder.createString( object.type );
			const geometry = processGeometry( object.geometry );
			// const material = parseMaterial( object.material );
			const children = codec.Object.createChildrenVector( builder, object.children.map( c => processObject( c ) ) );


			codec.Object.startObject( builder );
			codec.Object.addUuid( builder, uuid );
			codec.Object.addName( builder, name );
			codec.Object.addType( builder, type );
			codec.Object.addCastShadow( builder, object.castShadow );
			codec.Object.addReceiveShadow( builder, object.receiveShadow );
			codec.Object.addFrustumCulled( builder, object.frustumCulled );
			codec.Object.addRenderOrder( builder, object.renderOrder );
			codec.Object.addMatrix( builder, codec.Matrix4.createMatrix4( builder, ...object.matrix.elements ) );
			codec.Object.addLayers( builder, object.layers );

			if ( geometry ) {

				codec.Object.addGeometryType( builder, geometry.type );
				codec.Object.addGeometry( builder, geometry.geometry );

			}

			codec.Object.addChildren( builder, children );
			cache.objects.set( object.uuid, codec.Object.endObject( builder ) );
			return cache.objects.get( object.uuid );

		}

		const root = processObject( input );
		builder.finish( root );
		onDone( builder.asUint8Array() );

	}

}

export { FBSExporter };
