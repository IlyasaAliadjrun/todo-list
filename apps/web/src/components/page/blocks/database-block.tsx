import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { DatabaseView } from "@/components/database/DatabaseView";

/** Block kustom "database": menyimpan databaseId, merender TableView. */
export const DatabaseBlock = createReactBlockSpec(
  {
    type: "database",
    propSchema: { databaseId: { default: "" } },
    content: "none",
  },
  {
    render: ({ block }) => {
      const id = block.props.databaseId;
      if (!id) {
        return (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            Database belum siap…
          </div>
        );
      }
      return <DatabaseView databaseId={id} />;
    },
  },
);

/** Schema editor = block default + block database. */
export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    database: DatabaseBlock,
  },
});
