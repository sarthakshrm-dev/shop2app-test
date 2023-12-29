import { useEffect, useMemo, useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  FormLayout,
  TextField,
  Form,
  Autocomplete,
  Select,
  DropZone,
  Thumbnail,
} from "@shopify/polaris";
import { NoteMinor } from '@shopify/polaris-icons';
import { authenticate } from "../shopify.server";
import { useLoaderData } from "@remix-run/react";

async function fetchProducts(admin) {

  const response = await admin.graphql(
    `#graphql
    query productVendors {
      shop {
        productVendors(first: 200) {
          edges {
            node
          }
        }
      }
    }`
  );

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  const { edges } = data.data.shop.productVendors;
  const vendors = edges.map((edge) => {
    return {
      value: edge.node,
      label: edge.node
    }
  });

  return {
    vendors
  };
}

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const loaderData = await fetchProducts(admin);
  return json({
    loaderData
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
            vendor
            totalInventory
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        input: {
          title: formData.get('title'),
          variants: [{ price: formData.get('price') }],
          vendor: formData.get('vendor'),
          status: formData.get('status')
        },
      },
    }
  );
  const responseJson = await response.json();

  return json({
    product: responseJson.data.productCreate.product,
  });
};

export default function Index() {
  const { loaderData } = useLoaderData();
  const nav = useNavigation();
  const actionData = useActionData();
  const submit = useSubmit();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
  const productId = actionData?.product?.id.replace(
    "gid://shopify/Product/",
    ""
  );
  const deselectedOptions = useMemo(
    () => loaderData.vendors,
    [],
  );
  const [selected, setSelected] = useState('ACTIVE');

  const [file, setFile] = useState();

  const [selectedOptions, setSelectedOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState(deselectedOptions);

  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');

  const [disable, setDisable] = useState(true)

  useEffect(() => {
    if(productName!=='' && price!=='' && selected!=='' && selectedOptions.length>0) {
      setDisable(false)
    }
  }, [productName, price, selected, selectedOptions])

  const handleProductNameChange = useCallback((value) => {
    setProductName(value);
  }, []);

  const handlePriceChange = useCallback((value) => {
    setPrice(value);
  }, []);

  useEffect(() => {
    if (productId) {
      setInputValue('')
      setProductName('')
      setPrice('')
      setSelected('ACTIVE')
      shopify.toast.show("Product created");
    }
  }, [productId]);

  const updateText = useCallback(
    (value) => {
      setInputValue(value);

      if (value === '') {
        setOptions(deselectedOptions);
        return;
      }

      const filterRegex = new RegExp(value, 'i');
      const resultOptions = deselectedOptions.filter((option) =>
        option.label.match(filterRegex),
      );
      setOptions(resultOptions);
    },
    [deselectedOptions],
  );

  const updateSelection = useCallback(
    (selected) => {
      const selectedValue = selected.map((selectedItem) => {
        const matchedOption = options.find((option) => {
          return option.value.match(selectedItem);
        });
        return matchedOption && matchedOption.label;
      });

      setSelectedOptions(selected);
      setInputValue(selectedValue[0] || '');
    },
    [options],
  );

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      label="Vendor"
      value={inputValue}
      autoComplete="off"
    />
  );

  const handleSelectChange = useCallback(
    (value) => setSelected(value),
    [],
  );

  const handleDropZoneDrop = useCallback(
    (_dropFiles, acceptedFiles, _rejectedFiles) =>
      setFile(acceptedFiles[0]),
    [],
  );

  const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];

  const fileUpload = !file && (
    <DropZone.FileUpload actionHint="Accepts .gif, .jpg, and .png" />
  );
  const uploadedFile = file && (
    <InlineStack>
      <Thumbnail
        size="small"
        alt={file.name}
        source={
          validImageTypes.includes(file.type)
            ? window.URL.createObjectURL(file)
            : NoteMinor
        }
      />
      <div>
        {file.name}{' '}
        <Text variant="bodySm" as="p">
          {file.size} bytes
        </Text>
      </div>
    </InlineStack>
  );

  const generateProduct = () => {
    const formData = new FormData();
    formData.append('title', productName);
    formData.append('price', price);
    formData.append('status', selected);
    formData.append('vendor', selectedOptions);
    submit(formData, { replace: true, method: "POST" });
  }

  return (
    <Page
      title="Add Products"
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <Form>
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      type="text"
                      label="Product name"
                      onChange={handleProductNameChange}
                      autoComplete="off"
                      value={productName}
                    />
                  </FormLayout.Group>
                  <FormLayout.Group>
                    <TextField
                      type="number"
                      label="Price"
                      onChange={handlePriceChange}
                      autoComplete="off"
                      value={price}
                    />
                  </FormLayout.Group>
                  <FormLayout.Group>
                    <Select
                      label="Status"
                      options={[
                        { label: 'Active', value: 'ACTIVE' },
                        { label: 'Draft', value: 'DRAFT' }
                      ]}
                      onChange={handleSelectChange}
                      value={selected}
                    />
                    <Autocomplete
                      options={options}
                      selected={selectedOptions}
                      onSelect={updateSelection}
                      textField={textField}
                    />
                  </FormLayout.Group>
                  <Button disabled={disable} loading={isLoading} onClick={generateProduct}>Submit</Button>
                </FormLayout>
              </Form>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
