import short from 'short-uuid'
import { Project } from '@/models/project/Project'
import { Rundown } from '@/models/rundown/Rundown'
import { DeviceType, TimelineContentTypeCasparCg } from 'timeline-state-resolver-types'

export function getDefaultProject(newName = 'Default Project'): Omit<Project, 'id'> {
	return {
		name: newName,

		mappings: {
			'casparcg-1-10': {
				device: DeviceType.CASPARCG,
				deviceId: 'casparcg0',
				layerName: 'CasparCG 1 10',
			},
			'casparcg-1-20': {
				device: DeviceType.CASPARCG,
				deviceId: 'casparcg0',
				layerName: 'CasparCG 1 20',
			},
			'casparcg-1-30': {
				device: DeviceType.CASPARCG,
				deviceId: 'casparcg0',
				layerName: 'CasparCG 1 30',
			},
			'casparcg-2-10': {
				device: DeviceType.CASPARCG,
				deviceId: 'casparcg0',
				layerName: 'CasparCG 1 10',
			},
			'casparcg-2-20': {
				device: DeviceType.CASPARCG,
				deviceId: 'casparcg0',
				layerName: 'CasparCG 1 20',
			},
			'casparcg-2-30': {
				device: DeviceType.CASPARCG,
				deviceId: 'casparcg0',
				layerName: 'CasparCG 1 30',
			},
		},
		bridges: {
			bridget: {
				id: 'bridget',
				name: 'Bridget',
				outgoing: true,
				url: 'http://localhost:5401',
				settings: {
					devices: {}, // todo: add some default devices
				},
			},
		},

		settings: {},
	}
}
export function getDefaultRundown(newName = 'Default Rundown'): Omit<Rundown, 'id'> {
	return {
		name: newName,

		groups: [
			{
				id: short.generate(),
				name: 'Main',

				transparent: false,

				autoPlay: false,
				loop: false,
				parts: [
					{
						id: short.generate(),
						name: 'Part 1',
						timeline: [
							{
								resourceId: 'someResource0',
								obj: {
									id: 'random0',
									enable: {
										start: 0,
										duration: 5000,
									},
									layer: 'casparcg-1-10',
									content: {
										type: TimelineContentTypeCasparCg.MEDIA,
										file: 'AMB',
										deviceType: DeviceType.CASPARCG,
									},
								},
							},
						],

						resolved: {
							duration: 10000,
						},
					},
				],
				playout: {
					startTime: null,
					partIds: [],
				},
				playheadData: null,
			},
		],
	}
}
