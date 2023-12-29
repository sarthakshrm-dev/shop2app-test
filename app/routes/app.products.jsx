import {
  TextField,
  IndexTable,
  IndexFilters,
  useSetIndexFiltersMode,
  useIndexResourceState,
  Text,
  ChoiceList,
  RangeSlider,
  Badge,
  useBreakpoints,
  Card,
  Page,
  Pagination,
  Thumbnail,
} from '@shopify/polaris';
import { useState, useCallback, useEffect } from 'react';
import { authenticate } from "../shopify.server";
import { useLoaderData, json, useRouteLoaderData } from '@remix-run/react';
import { useNavigate } from '@remix-run/react';
import { useRevalidator } from '@remix-run/react';

async function fetchProducts(admin, cursor = null, direction = 'after', indicator = 'first', status = '') {

  let statusQuery;

  if (status && status.trim() !== "") {
    statusQuery = `status:${status}`;
  }

  const response = await admin.graphql(
    `#graphql
    query getProducts($cursor: String) {
      products(${indicator}: 10, ${direction}: $cursor${statusQuery ? `, query: "${statusQuery}"` : ''}) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            title
            handle
            status
            vendor
            totalInventory
            tracksInventory
            totalVariants
            priceRangeV2 {
              maxVariantPrice {
                amount
                currencyCode
              }
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
            }
            productCategory {
              productTaxonomyNode {
                name
              }
            }
          }
        }
      }
    }`,
    {
      variables: {
        cursor: cursor,
      }
    }
  );

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  const { edges, pageInfo } = data.data.products;
  const products = edges.map((edge) => edge.node);

  return {
    products,
    pageInfo: pageInfo,
  };
}

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url)
  const cursor = url.searchParams.get('cursor') || null
  const direction = url.searchParams.get('direction') || 'after'
  const indicator = url.searchParams.get('indicator') || 'first'
  const status = url.searchParams.get('status') || ''
  const loaderData = await fetchProducts(admin, cursor, direction, indicator, status);
  return json({
    loaderData
  });
};

export default function AdditionalPage() {
  const { loaderData } = useLoaderData();
  const [products, setProducts] = useState(loaderData.products || []);
  const [pageInfo, setPageInfo] = useState(loaderData.pageInfo || {});
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState('')

  const navig = useNavigate();
  const revalidator = useRevalidator();

  useEffect(() => {
    setProducts(loaderData.products)
    setPageInfo(loaderData.pageInfo);
  }, [loaderData])

  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const [itemStrings, setItemStrings] = useState([
    'All',
    'Active',
    'Draft'
  ]);

  const tabs = itemStrings.map((item, index) => ({
    content: item,
    index,
    id: `${item}-${index}`,
    isLocked: index === 0
  }));
  const [selected, setSelected] = useState(0);
  const onCreateNewView = async (value) => {
    await sleep(500);
    setItemStrings([...itemStrings, value]);
    setSelected(itemStrings.length);
    return true;
  };

  const { mode, setMode } = useSetIndexFiltersMode();
  const onHandleCancel = () => { };

  const onHandleSave = async () => {
    await sleep(1);
    return true;
  };

  useEffect(() => {
    if(params==='') {
      setSelected(0)
    } else if(params==='ACTIVE') {
      setSelected(1)
    } else if(params==='DRAFT') {
      setSelected(2)
    }
  }, [params])

  useEffect(() => {
    if (selected === 0) {
      navig('/app/products')
      setParams('')
    } else if (selected === 1) {
      navig('/app/products?status=ACTIVE')
      setParams('?status=ACTIVE')
    } else if (selected === 2) {
      navig('/app/products?status=DRAFT')
      setParams('?status=DRAFT')
    }
  }, [selected])

  const primaryAction =
    selected === 0
      ? {
        type: 'save-as',
        onAction: onCreateNewView,
        disabled: false,
        loading: false,
      }
      : {
        type: 'save',
        onAction: onHandleSave,
        disabled: false,
        loading: false,
      };
  const [accountStatus, setAccountStatus] = useState(
    undefined,
  );
  const [moneySpent, setMoneySpent] = useState(
    undefined,
  );
  const [taggedWith, setTaggedWith] = useState('');
  const [queryValue, setQueryValue] = useState('');

  const handleAccountStatusChange = useCallback(
    (value) => setAccountStatus(value),
    [],
  );
  const handleMoneySpentChange = useCallback(
    (value) => setMoneySpent(value),
    [],
  );
  const handleTaggedWithChange = useCallback(
    (value) => setTaggedWith(value),
    [],
  );
  const handleFiltersQueryChange = useCallback(
    (value) => setQueryValue(value),
    [],
  );
  const handleAccountStatusRemove = useCallback(
    () => setAccountStatus(undefined),
    [],
  );
  const handleMoneySpentRemove = useCallback(
    () => setMoneySpent(undefined),
    [],
  );
  const handleTaggedWithRemove = useCallback(() => setTaggedWith(''), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);
  const handleFiltersClearAll = useCallback(() => {
    handleAccountStatusRemove();
    handleMoneySpentRemove();
    handleTaggedWithRemove();
    handleQueryValueRemove();
  }, [
    handleAccountStatusRemove,
    handleMoneySpentRemove,
    handleQueryValueRemove,
    handleTaggedWithRemove,
  ]);

  const filters = [
    {
      key: 'accountStatus',
      label: 'Account status',
      filter: (
        <ChoiceList
          title="Account status"
          titleHidden
          choices={[
            { label: 'Enabled', value: 'enabled' },
            { label: 'Not invited', value: 'not invited' },
            { label: 'Invited', value: 'invited' },
            { label: 'Declined', value: 'declined' },
          ]}
          selected={accountStatus || []}
          onChange={handleAccountStatusChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'taggedWith',
      label: 'Tagged with',
      filter: (
        <TextField
          label="Tagged with"
          value={taggedWith}
          onChange={handleTaggedWithChange}
          autoComplete="off"
          labelHidden
        />
      ),
      shortcut: true,
    },
    {
      key: 'moneySpent',
      label: 'Money spent',
      filter: (
        <RangeSlider
          label="Money spent is between"
          labelHidden
          value={moneySpent || [0, 500]}
          prefix="$"
          output
          min={0}
          max={2000}
          step={1}
          onChange={handleMoneySpentChange}
        />
      ),
    },
  ];

  const appliedFilters = [];
  if (accountStatus && !isEmpty(accountStatus)) {
    const key = 'accountStatus';
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, accountStatus),
      onRemove: handleAccountStatusRemove,
    });
  }
  if (moneySpent) {
    const key = 'moneySpent';
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, moneySpent),
      onRemove: handleMoneySpentRemove,
    });
  }
  if (!isEmpty(taggedWith)) {
    const key = 'taggedWith';
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, taggedWith),
      onRemove: handleTaggedWithRemove,
    });
  }

  const orders = [
    {
      id: '1020',
      order: (
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          #1020
        </Text>
      ),
      date: 'Jul 20 at 4:34pm',
      customer: 'Jaydon Stanton',
      total: '$969.44',
      paymentStatus: <Badge progress="complete">Paid</Badge>,
      fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge>,
    },
    {
      id: '1019',
      order: (
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          #1019
        </Text>
      ),
      date: 'Jul 20 at 3:46pm',
      customer: 'Ruben Westerfelt',
      total: '$701.19',
      paymentStatus: <Badge progress="partiallyComplete">Partially paid</Badge>,
      fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge>,
    },
    {
      id: '1018',
      order: (
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          #1018
        </Text>
      ),
      date: 'Jul 20 at 3.44pm',
      customer: 'Leo Carder',
      total: '$798.24',
      paymentStatus: <Badge progress="complete">Paid</Badge>,
      fulfillmentStatus: <Badge progress="incomplete">Unfulfilled</Badge>,
    },
  ];
  const resourceName = {
    singular: 'order',
    plural: 'orders',
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(orders);

  const rowMarkup = products.map(
    (
      { id, title, vendor, status, productCategory, totalInventory, tracksInventory, totalVariants, priceRangeV2, featuredImage },
      index,
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Thumbnail
            source={featuredImage?.url}
            alt={title}
            size="small"
          />
        </IndexTable.Cell>
        <IndexTable.Cell>{title}</IndexTable.Cell>
        <IndexTable.Cell>{priceRangeV2.minVariantPrice.amount === priceRangeV2.maxVariantPrice.amount ? `${priceRangeV2.minVariantPrice.currencyCode} ${priceRangeV2.minVariantPrice.amount}` : `${priceRangeV2.minVariantPrice.currencyCode} ${priceRangeV2.minVariantPrice.amount} - ${priceRangeV2.maxVariantPrice.amount}`}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'info' : ''}>{status}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>{tracksInventory ? totalVariants > 1 ? `${totalInventory} in stock for ${totalVariants} variants` : `${totalInventory} in stock` : 'Inventory not tracked'}</IndexTable.Cell>
        <IndexTable.Cell>{vendor}</IndexTable.Cell>
        <IndexTable.Cell>{productCategory?.productTaxonomyNode?.name}</IndexTable.Cell>
        {/* <IndexTable.Cell>{customer}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" alignment="end" numeric>
            {total}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{paymentStatus}</IndexTable.Cell>
        <IndexTable.Cell>{fulfillmentStatus}</IndexTable.Cell> */}
      </IndexTable.Row>
    ),
  );

  return (
    <Page
      title="Products List"
      fullWidth={true}
    >
      {loading ?
        <Card>
          Hello
        </Card>
        :
        <>
          <IndexFilters
            queryValue={queryValue}
            queryPlaceholder="Searching in all"
            onQueryChange={handleFiltersQueryChange}
            onQueryClear={() => setQueryValue('')}
            primaryAction={primaryAction}
            cancelAction={{
              onAction: onHandleCancel,
              disabled: false,
              loading: false,
            }}
            tabs={tabs}
            selected={selected}
            onSelect={setSelected}
            filters={filters}
            appliedFilters={appliedFilters}
            onClearAll={handleFiltersClearAll}
            mode={mode}
            setMode={setMode}
            hideQueryField
          />
          <IndexTable
            condensed={useBreakpoints().smDown}
            resourceName={resourceName}
            itemCount={orders.length}
            selectedItemsCount={
              allResourcesSelected ? 'All' : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: '' },
              { title: 'Product Name' },
              { title: 'Pricing' },
              { title: 'Status' },
              { title: 'Inventory' },
              { title: 'Vendor' },
              { title: 'Category' },
            ]}
            pagination={{
              hasNext: pageInfo.hasNextPage,
              hasPrevious: pageInfo.hasPreviousPage,
              onNext: async () => {
                const currentUrl = window.location.href;
                const url = new URL(currentUrl);
                const pathname = url.pathname;
                let query = `direction=after&indicator=first&cursor=${pageInfo.endCursor}`
                if(params==='') {
                  await navig(`${pathname}?${query}`)
                } else {
                  await navig(`${pathname}${params}&${query}`)
                }
                revalidator.revalidate()
              },
              onPrevious: async () => {
                const currentUrl = window.location.href;
                const url = new URL(currentUrl);
                const pathname = url.pathname;
                let query = `direction=before&indicator=last&cursor=${pageInfo.startCursor}`
                if(params==='') {
                  await navig(`${pathname}?${query}`)
                } else {
                  await navig(`${pathname}${params}&${query}`)
                }
                revalidator.revalidate()
              },
            }}
          >
            {rowMarkup}
          </IndexTable>
        </>}
    </Page>

  );

  function disambiguateLabel(key, value) {
    switch (key) {
      case 'moneySpent':
        return `Money spent is between $${value[0]} and $${value[1]}`;
      case 'taggedWith':
        return `Tagged with ${value}`;
      case 'accountStatus':
        return value.map((val) => `Customer ${val}`).join(', ');
      default:
        return value;
    }
  }

  function isEmpty(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === '' || value == null;
    }
  }
}