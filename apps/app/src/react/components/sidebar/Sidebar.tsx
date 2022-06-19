import React, { useEffect, useState } from 'react'
import { ResourceAny } from '@shared/models'
import { describeTimelineObject } from '../../../lib/TimelineObj'
import { ResourceData } from './resource/ResourceData'
import { ResourceLibrary } from './resource/ResourceLibrary'
import { TemplateData } from './template/TemplateData'
import { TimelineObjData } from './timelineObj/TimelineObjData'
import { TimelineContentTypeCasparCg } from 'timeline-state-resolver-types'
import { Project } from '../../../models/project/Project'
import { store } from '../../mobx/store'
import { observer } from 'mobx-react-lite'
import { useMemoComputedObject, useMemoComputedValue } from '../../mobx/lib'
import { compact } from '@shared/lib'

export const Sidebar: React.FC<{ mappings: Project['mappings'] }> = observer(function Sidebar(props) {
	const [resources, setResources] = useState<Array<ResourceAny | undefined>>([])

	const storeResources = useMemoComputedObject(() => store.resourcesStore.resources, [])

	const currentRundownId = useMemoComputedValue(() => {
		return store.rundownsStore.currentRundownId
	}, [])

	const editing = useMemoComputedObject(
		() => {
			const selected = store.guiStore.selected
			const group =
				(currentRundownId &&
					selected.groupId &&
					store.rundownsStore.hasGroup(selected.groupId) &&
					store.rundownsStore.getGroup(selected.groupId)) ||
				null
			const part =
				(currentRundownId &&
					selected.groupId &&
					selected.partId &&
					store.rundownsStore.hasPart(selected.partId) &&
					store.rundownsStore.getPart(selected.partId)) ||
				null
			const timelineObjs =
				(currentRundownId &&
					selected.groupId &&
					selected.partId &&
					compact(
						selected.timelineObjIds.map(
							(objId) =>
								store.rundownsStore.hasTimelineObj(objId) && store.rundownsStore.getTimelineObj(objId)
						)
					)) ||
				[]

			if (group && part) {
				return {
					group,
					part,
					timelineObjs,
				}
			} else return null
		},
		[currentRundownId],
		true
	)

	useEffect(() => {
		if (editing) {
			if (editing.timelineObjs.length > 0) {
				const newResources = editing.timelineObjs.map((obj) => {
					if (obj.resourceId) {
						return storeResources[obj.resourceId]
					}
				})
				if (newResources.length > 0) {
					setResources(newResources)
					return
				}
			}
		}

		setResources([])
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editing, storeResources])

	if (!currentRundownId) {
		return null
	}

	if (editing) {
		const descriptions = editing.timelineObjs.map((obj) => describeTimelineObject(obj.obj))
		const groupOrPartLocked = editing.group.locked || editing.part.locked

		return (
			<div className="sidebar timeline-obj-sidebar">
				{editing.timelineObjs.map((obj, index) => {
					return (
						<div key={obj.obj.id}>
							<div className="title">{descriptions[index].label}</div>

							{resources[index] && <ResourceData resource={resources[index] as ResourceAny} />}

							<TimelineObjData
								rundownId={currentRundownId}
								groupId={editing.group.id}
								partId={editing.part.id}
								timelineObj={obj}
								mappings={props.mappings}
								disabled={groupOrPartLocked}
							/>

							{(obj.obj.content as any)?.type === TimelineContentTypeCasparCg.TEMPLATE && (
								<TemplateData
									rundownId={currentRundownId}
									groupId={editing.group.id}
									partId={editing.part.id}
									timelineObjId={obj.obj.id}
									templateData={JSON.parse((obj.obj.content as any)?.data)}
									disabled={groupOrPartLocked}
								/>
							)}
						</div>
					)
				})}
			</div>
		)
	} else {
		// not editing
		return <ResourceLibrary />
	}
})
