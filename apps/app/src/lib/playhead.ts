import { Group } from '../models/rundown/Group'
import {
	GroupPreparedPlayData,
	GroupPreparedPlayDataMulti,
	GroupPreparedPlayDataSingle,
} from '../models/GUI/PreparedPlayhead'
import { Part } from '../models/rundown/Part'
import { findPart } from './util'
import { assertNever } from '@shared/lib'

/** Calculates how the parts in a group is going to be played
 * @see GroupPreparedPlayheadData
 */
export function prepareGroupPlayData(group: Group): GroupPreparedPlayData | null {
	if (group.oneAtATime) {
		const playingPartId = Object.keys(group.playout.playingParts)[0]
		const groupStartTime = playingPartId ? group.playout.playingParts[playingPartId].startTime : null

		// Is playing?
		if (groupStartTime && playingPartId) {
			const data: GroupPreparedPlayDataSingle = {
				type: 'single',
				startTime: 0,
				duration: 0,
				parts: [],
				repeating: null,
			}
			data.startTime = groupStartTime

			const part = findPart(group, playingPartId)
			if (!part) {
				return null
			}

			if (group.loop && !group.autoPlay) {
				// Only loop the one part

				// Add the rudown into .repeating instead, to make it loop:
				data.parts = []
				data.duration = 0 // Becase .parts is empty
				data.repeating = {
					duration: 0, // set later
					parts: [],
				}

				let nextStartTime = groupStartTime
				// Add the part
				data.repeating.parts.push({
					startTime: nextStartTime,
					duration: part.resolved.duration,
					part,
					endAction: 'loop',
				})
				nextStartTime += part.resolved.duration

				data.repeating.duration = part.resolved.duration
			} else {
				/** The startTime of the next Part. */
				let nextStartTime = groupStartTime

				// Add the starting Part:
				let prevPart: GroupPreparedPlayDataSingle['parts'][0] = {
					startTime: nextStartTime,
					duration: part.resolved.duration,
					part,
					endAction: 'stop', // Changed later
				}
				data.parts.push(prevPart)

				nextStartTime += part.resolved.duration
				data.duration = nextStartTime - groupStartTime // Note: This might be overwritten later.

				if (group.autoPlay) {
					// Add the rest of the Parts in the group:
					const currentPartIndex = group.parts.findIndex((r) => r.id === part.id)
					const restParts = group.parts.slice(currentPartIndex + 1)

					for (const part of restParts) {
						// Change the previous part:
						prevPart.endAction = 'next'

						// Add the part:
						prevPart = {
							startTime: nextStartTime,
							duration: part.resolved.duration,
							part: part,
							endAction: 'stop', // Changed later
						}
						data.parts.push(prevPart)
						nextStartTime += part.resolved.duration
					}
					data.duration = nextStartTime - groupStartTime

					// Looping parts:
					if (group.loop) {
						data.repeating = {
							duration: 0,
							parts: [],
						}

						let repeatingDuration = 0
						for (const part of group.parts) {
							// Change the previous part:
							prevPart.endAction = 'next'
							// Add the part:
							prevPart = {
								startTime: nextStartTime,
								duration: part.resolved.duration,
								part: part,
								endAction: 'next',
							}
							data.repeating.parts.push(prevPart)
							nextStartTime += part.resolved.duration
							repeatingDuration += part.resolved.duration
						}
						data.repeating.duration = repeatingDuration
					}
				}
			}
			return data
		}
	} else {
		// Playing multiple parts at the same time.

		const partIds = Object.keys(group.playout.playingParts)
		// Is playing?
		if (partIds.length > 0) {
			const data: GroupPreparedPlayDataMulti = {
				type: 'multi',
				parts: {},
			}

			for (const playingPartId of partIds) {
				const playingPart = group.playout.playingParts[playingPartId]

				const part = findPart(group, playingPartId)
				if (part) {
					data.parts[playingPartId] = {
						startTime: playingPart.startTime,
						duration: part.resolved.duration,
						part,
						endAction: 'stop',
					}
				}
			}
			return data
		}
	}
	return null
}

/**
 * Calculates which parts in GroupPreparedPlayheadData is currently on-air, and how far in it we currently are.
 */
export function getGroupPlayData(prepared: GroupPreparedPlayData | null, now = Date.now()): GroupPlayData {
	const playData: GroupPlayData = {
		groupIsPlaying: false,
		anyPartIsPlaying: false,
		playheads: {},
		countdowns: {},
	}

	if (prepared) {
		if (prepared.type === 'single') {
			let playheadPartId: string | null = null
			let playhead: GroupPlayDataPlayhead | null = null

			if (now >= prepared.startTime && now < prepared.startTime + prepared.duration) {
				for (const part of prepared.parts) {
					const partStartTime = part.startTime
					const partEndTime = partStartTime + part.duration

					addCountdown(playData, part.part, partStartTime - now)

					if (now >= partStartTime && now < partEndTime) {
						playheadPartId = part.part.id
						playhead = {
							playheadTime: now - partStartTime,
							partStartTime: partStartTime,
							partEndTime: partEndTime,
							isInRepeating: false,
							endAction: part.endAction,
						}
					}
				}
			}

			if (prepared.repeating) {
				// Is in the repeating section

				/** When the repeating first starts (unix timestamp) */
				const repeatingStartTime = prepared.startTime + prepared.duration
				/** A value that goes from 0 - repeating.duration */
				const nowInRepeating = (now - repeatingStartTime) % prepared.repeating.duration
				/** When the current iteration of the repeating started (unix timestamp) */
				const currentRepeatingStartTime = now - nowInRepeating
				/** When the next iteration of the repeating wll start (unix timestamp) */
				// const nextRepeatingStartTime = currentRepeatingStartTime + prepared.repeating.duration
				/** How much to add to times to get the times in the current repetition [ms] */
				const repeatAddition = currentRepeatingStartTime - repeatingStartTime

				for (const part of prepared.repeating.parts) {
					/** Start time of the part, in this repetition (unix timestamp) */
					const partStartTime = part.startTime + repeatAddition
					/** End time of the part (unix timestamp) */
					const partEndTime = partStartTime + part.duration

					const timeUntilPart = partStartTime - now
					addCountdown(playData, part.part, timeUntilPart)
					addCountdown(playData, part.part, timeUntilPart + prepared.repeating.duration) // Also add for the next repeating loop

					if (now >= partStartTime && now < partEndTime) {
						playheadPartId = part.part.id
						playhead = {
							playheadTime: now - partStartTime,
							partStartTime: partStartTime,
							partEndTime: partEndTime,
							isInRepeating: true,
							endAction: part.endAction,
						}
					}
				}
			}

			if (playheadPartId && playhead) {
				playData.groupIsPlaying = true
				playData.anyPartIsPlaying = true
				playData.playheads[playheadPartId] = playhead
			}
		} else if (prepared.type === 'multi') {
			for (const [playingPartId, playingPart] of Object.entries(prepared.parts)) {
				const partStartTime = playingPart.startTime
				const partEndTime = partStartTime + playingPart.duration

				addCountdown(playData, playingPart.part, partStartTime - now)

				if (now >= partStartTime && now < partEndTime) {
					playData.anyPartIsPlaying = true
					playData.playheads[playingPartId] = {
						playheadTime: now - partStartTime,
						partStartTime: partStartTime,
						partEndTime: partEndTime,
						endAction: 'stop',
						isInRepeating: false,
					}
				}
			}
		} else {
			assertNever(prepared)
		}
	}

	return playData
}
/** Add a coundown until a Part */
function addCountdown(playData: GroupPlayData, part: Part, duration: number) {
	if (duration < 0) return

	if (!playData.countdowns[part.id]) playData.countdowns[part.id] = []
	playData.countdowns[part.id].push(duration)
}
export interface GroupPlayData {
	/** If the Group is playing (this is always false if one-at-a-time is set) */
	groupIsPlaying: boolean
	/** If any part in the group is playing */
	anyPartIsPlaying: boolean

	/** Map of the playhead(s) */
	playheads: {
		[partId: string]: GroupPlayDataPlayhead
	}

	/** Time(s) until parts will start playing: */
	countdowns: { [partId: string]: number[] }
}
export interface GroupPlayDataPlayhead {
	/** The current time of the playhead (ie time since the part started) [ms] */
	playheadTime: number
	/** The time when the part started playing (unix time) */
	partStartTime: number
	/** The end time of the part the playhead is in (unix time)  */
	partEndTime: number
	/** What the playhead will to when it reaches the partEndTime */
	endAction: 'stop' | 'next' | 'loop'

	/** Whether the playhead has entered the repeating part of parts */
	isInRepeating: boolean
}
