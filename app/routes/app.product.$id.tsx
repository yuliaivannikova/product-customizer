import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData, useActionData, data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "app/db.server";
type Field = {
    id: string;
    type: string;
    label: string;
};
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
    const productId = `gid://shopify/Product/${params.id}`;
    const response = await admin.graphql(
        `#graphql
            query getProduct($id: ID!) {
                product(id: $id) {
                    id
                    title
                }
            }`,
        { variables: { id: productId } }
    );
    const data = await response.json();
    const product = data.data.product;
    const config = await prisma.customizerConfig.findUnique({
        where: { shop_productId: { shop: session.shop, productId } },
        include: { fields: true },
    });
    const fields = config?.fields ?? [];
    return { product, fields };
};

async function syncFieldsToMetafield(admin: any, shop: string, productId: string) {
    const config = await prisma.customizerConfig.findUnique({
        where: { shop_productId: { shop, productId } },
        include: { fields: true },
    });
    const fields = config?.fields ?? [];
    const cleanFields = fields.map(f => ({ type: f.type, label: f.label }));
    await admin.graphql(
        `#graphql
          mutation setMetafield($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                  metafields {
                      id
                  }
                  userErrors {
                      field
                      message
                  }
              }
          }`,
        {
            variables: {
                metafields: [
                    {
                        ownerId: productId,
                        namespace: "customizer",
                        key: "fields",
                        type: "json",
                        value: JSON.stringify(cleanFields),
                    },
                ],
            },
        }
    );
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const _action = formData.get("_action") as string;
    const productId = `gid://shopify/Product/${params.id}`;
    const shop = session.shop;
    if (_action === "delete") {
        const fieldId = formData.get("fieldId") as string;
        await prisma.customizerField.delete({ where: { id: fieldId } });
        await syncFieldsToMetafield(admin, session.shop, productId);
        return { ok: true };
    }
    if (_action === "update") {
        const fieldId = formData.get("fieldId") as string;
        const type = formData.get("type") as string;
        const label = formData.get("label") as string;
        if (label.length) {
            await prisma.customizerField.update({
                where: { id: fieldId },
                data: { type, label },
            });
            await syncFieldsToMetafield(admin, session.shop, productId);
            return { ok: true };
        } else {
            return data({ error: "Field name is required" }, { status: 400 });
        }

    }
    const fieldType = formData.get("type") as string;
    const fieldLabel = formData.get("label") as string;
    let config = await prisma.customizerConfig.findUnique({
        where: { shop_productId: { shop, productId } },
    });
    if (!config) {
        config = await prisma.customizerConfig.create({
            data: { shop, productId },
        });
    }
    if (fieldLabel.length) {
        await prisma.customizerField.create({
            data: {
                configId: config.id,
                type: fieldType,
                label: fieldLabel,
            },
        });
        await syncFieldsToMetafield(admin, session.shop, productId);
        return { ok: true };
    } else {
        return data({ error: "Field name is required" }, { status: 400 });
    }
   
};
export default function ProductCustomizer() {
    const { product, fields } = useLoaderData<typeof loader>();
    const [editingField, setEditingField] = useState<Field | null>(null);
    const actionData = useActionData<typeof action>();
    return (
        <s-page heading={product.title}>
            <s-section heading="Customization set up">
                <s-section heading={editingField ? "Edit field" : "Add customization field"}>
                    {actionData && "error" in actionData && (
                        <s-banner tone="critical">{actionData.error}</s-banner>
                    )}
                    <Form method="post" onSubmit={() => setEditingField(null)}>
                        <input
                            type="hidden"
                            name="_action"
                            value={editingField ? "update" : "create"}
                        />
                        {editingField && (
                            <input type="hidden" name="fieldId" value={editingField.id} />
                        )}
                        <s-stack gap="base">
                            <s-select
                                name="type"
                                label="Field type"
                                value={editingField?.type}
                            >
                                <s-option value="text">Text</s-option>
                                <s-option value="color">Color</s-option>
                            </s-select>
                            <s-text-field
                                name="label"
                                label="Field name"
                                placeholder="Your text"
                                required
                                value={editingField?.label}
                            />
                            <s-stack direction="inline" gap="base">
                                <s-button type="submit">
                                    {editingField ? "Save" : "Add field"}
                                </s-button>
                                {editingField && (
                                    <s-button
                                        variant="tertiary"
                                        onClick={() => setEditingField(null)}
                                    >
                                        Cancel
                                    </s-button>
                                )}
                            </s-stack>
                        </s-stack>
                    </Form>
                </s-section>
                {fields.length > 0 && (
                    <s-section heading="Saved fields">
                        <s-stack gap="base">
                            {fields.map((field) => (
                                <s-box
                                    key={field.id}
                                    padding="base"
                                    borderWidth="base"
                                    borderRadius="base"
                                >
                                    <s-stack
                                        direction="inline"
                                        gap="base"
                                        alignItems="center"
                                        justifyContent="space-between"
                                    >
                                        <s-text variant="bodyMd">
                                            {field.label} ({field.type})
                                        </s-text>
                                        <s-stack direction="inline" gap="tight">
                                            <s-button
                                                variant="tertiary"
                                                onClick={() => setEditingField(field)}
                                            >
                                                Edit
                                            </s-button>
                                            <Form method="post">
                                                <input type="hidden" name="_action" value="delete" />
                                                <input type="hidden" name="fieldId" value={field.id} />
                                                <s-button type="submit" tone="critical">
                                                    Delete
                                                </s-button>
                                            </Form>
                                        </s-stack>
                                    </s-stack>
                                </s-box>
                            ))}
                        </s-stack>
                    </s-section>
                )}
            </s-section>
        </s-page>
    );
}