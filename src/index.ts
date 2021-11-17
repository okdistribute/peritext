import { createEditor, initializeDocs } from "./bridge"
import { Publisher } from "./pubsub"
import type { Change } from "./micromerge"
import type { Editor } from "./bridge"
import { Mark } from "prosemirror-model"
import Micromerge from "./micromerge"
import { playTrace, trace } from "./playback"

const publisher = new Publisher<Array<Change>>()

const editors: { [key: string]: Editor } = {}

const renderMarks = (domNode: Element, marks: Mark[]): void => {
    domNode.innerHTML = marks
        .map(m => `• ${m.type.name} ${Object.keys(m.attrs).length !== 0 ? JSON.stringify(m.attrs) : ""}`)
        .join("<br/>")
}

const aliceDoc = new Micromerge("alice")
const bobDoc = new Micromerge("bob")

initializeDocs([aliceDoc, bobDoc])

const aliceNode = document.querySelector("#alice")
const aliceEditor = aliceNode?.querySelector(".editor")
const aliceChanges = aliceNode?.querySelector(".changes")
const aliceMarks = aliceNode?.querySelector(".marks")

if (aliceNode && aliceEditor && aliceChanges && aliceMarks) {
    editors["alice"] = createEditor({
        actorId: "alice",
        editorNode: aliceEditor,
        changesNode: aliceChanges,
        doc: aliceDoc,
        publisher,
        handleClickOn: (view, pos, node, nodePos, event, direct) => {
            // Prosemirror calls this once per node that overlaps w/ the clicked pos.
            // We only want to run our callback once, on the innermost clicked node.
            if (!direct) return false

            const marksAtPosition = view.state.doc.resolve(pos).marks()
            renderMarks(aliceMarks, marksAtPosition)
            return false
        },
    })

    // Every 1 second, insert new text into the editor
    // setInterval(() => {
    //     change(editors["alice"], editors["bob"])
    // }, 300)
} else {
    throw new Error(`Didn't find expected node in the DOM`)
}

const bobNode = document.querySelector("#bob")
const bobEditor = bobNode?.querySelector(".editor")
const bobChanges = bobNode?.querySelector(".changes")
if (bobNode && bobEditor && bobChanges) {
    editors["bob"] = createEditor({
        actorId: "bob",
        editorNode: bobEditor,
        changesNode: bobChanges,
        doc: bobDoc,
        publisher,
        handleClickOn: (view, pos, node, nodePos, event, direct) => {
            // Prosemirror calls this once per node that overlaps w/ the clicked pos.
            // We only want to run our callback once, on the innermost clicked node.
            if (!direct) return false

            const marksAtPosition = view.state.doc.resolve(pos).marks()
            renderMarks(aliceMarks, marksAtPosition)
            return false
        },
    })
} else {
    throw new Error(`Didn't find expected node in the DOM`)
}

for (const editor of Object.values(editors)) {
    editor.queue.drop()
}

// Add a button for syncing the two editors
document.querySelector("#sync")?.addEventListener("click", () => {
    for (const editor of Object.values(editors)) {
        editor.queue.flush()
    }
})

playTrace(trace, editors["alice"], editors["bob"])