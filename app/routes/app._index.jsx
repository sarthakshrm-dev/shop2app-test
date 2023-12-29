import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useNavigate } from "@remix-run/react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  const navig = useNavigate();

  return (
    <Page>
      <ui-title-bar title="Products Wizard">
      </ui-title-bar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to producst wizard 🎉
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This is your one stop shop to manage all your products with ease.
                  </Text>
                </BlockStack>
                <InlineStack gap="300">
                  <Button onClick={() => {navig('/app/add');}}>
                    Add Products
                  </Button>
                  <Button onClick={() => {navig('/app/products');}}>
                    Get Products
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
