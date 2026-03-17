import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { log } from "console";

type Product = {
    id: string;
    title: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const after = url.searchParams.get("after");
    const before = url.searchParams.get("before");
    const variables = before
        ? { last: 10, before }
        : { first: 10, ...(after ? { after } : {}) };
    const response = await admin.graphql(`
        #graphql
           query getProducts($first: Int, $after: String, $last: Int, $before: String) {
            products(first: $first, after: $after, last: $last, before: $before) {
            nodes {
                id
                title
            }
            pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
            }
            }
        }`, 
    { variables }
    );
    const data = await response.json();
    console.log(data.data);
    return { products: data.data.products.nodes as Product[], pageInfo: data.data.products.pageInfo };
};
 

export default function Products() {
    const { products, pageInfo } = useLoaderData<typeof loader>();
    
    return (
        <s-page heading="Products Customizer">
            <s-section heading="Choose the product to customize">
                <s-stack gap="base">
                    {products.map((product) => (
                  
                            <s-box
                                key={product.id}
                                padding="base"
                                borderWidth="base"
                                borderRadius="base"
                            >

                                
                            <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                                <s-text>{product.title}</s-text>
                                <s-button href={`/app/product/${product.id.split('/').pop() }`}>Set up</s-button>
                                </s-stack>
                           
                            </s-box>
                    ))}
                    <s-stack direction="inline" gap="base" justifyContent="center">
                        {pageInfo.hasPreviousPage && (
                            <s-button href={`/app/products?before=${pageInfo.startCursor}`}>
                                Previous
                            </s-button>
                        )}
                        {pageInfo.hasNextPage && (
                            <s-button href={`/app/products?after=${pageInfo.endCursor}`}>
                                Next
                            </s-button>
                        )}
                    </s-stack>
                </s-stack >
            </s-section>
        </s-page>
    );
}