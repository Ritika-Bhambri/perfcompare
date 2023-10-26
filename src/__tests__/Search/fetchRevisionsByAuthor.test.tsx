import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

import SearchView from '../../components/Search/SearchView';
import { Strings } from '../../resources/Strings';
import useProtocolTheme from '../../theme/protocolTheme';
import { InputType } from '../../types/state';
import getTestData from '../utils/fixtures';
import { renderWithRouter, store } from '../utils/setupTests';
import { screen } from '../utils/test-utils';

describe('SearchView/fetchRevisionsByAuthor', () => {
  const protocolTheme = renderHook(() => useProtocolTheme()).result.current
    .protocolTheme;

  const toggleColorMode = renderHook(() => useProtocolTheme()).result.current
    .toggleColorMode;
  it('should fetch revisions by author if searchValue is an email address', async () => {
    const { testData } = getTestData();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => ({
          results: testData,
        }),
      }),
    ) as jest.Mock;

    // set delay to null to prevent test time-out due to useFakeTimers
    const user = userEvent.setup({ delay: null });

    renderWithRouter(
      <SearchView
        toggleColorMode={toggleColorMode}
        protocolTheme={protocolTheme}
        title={Strings.metaData.pageTitle.search}
      />,
    );

    await screen.findAllByRole('button', { name: 'Base' });
    expect(screen.getAllByText('try')[0]).toBeInTheDocument();
    const searchInput = screen.getAllByRole('textbox')[0];
    await user.type(searchInput, 'johncleese@python.com');
    jest.runOnlyPendingTimers();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://treeherder.mozilla.org/api/project/try/push/?author=johncleese@python.com',
    );

    await screen.findAllByText("you've got no arms left!");
    expect(
      screen.getAllByText("it's just a flesh wound")[0],
    ).toBeInTheDocument();
  });

  it('should reject fetchRevisionsByAuthor if fetch returns no results', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => ({
          results: [],
        }),
      }),
    ) as jest.Mock;
    const searchType = 'base' as InputType;

    // set delay to null to prevent test time-out due to useFakeTimers
    const user = userEvent.setup({ delay: null });

    await act(async () => {
      renderWithRouter(
        <SearchView
          toggleColorMode={toggleColorMode}
          protocolTheme={protocolTheme}
          title={Strings.metaData.pageTitle.search}
        />,
      );
    });

    await screen.findAllByRole('button', { name: 'Base' });
    const searchInput = screen.getAllByRole('textbox')[0];
    await user.type(searchInput, 'ericidle@python.com');
    await act(async () => void jest.runOnlyPendingTimers());

    expect(global.fetch).toHaveBeenCalledWith(
      'https://treeherder.mozilla.org/api/project/try/push/?author=ericidle@python.com',
    );

    await screen.findAllByText('No results found');
    expect(store.getState().search[searchType].searchResults).toStrictEqual([]);
    expect(store.getState().search[searchType].inputError).toBe(true);
    expect(store.getState().search[searchType].inputHelperText).toBe(
      'No results found',
    );
  });

  it('should update error state if fetchRevisionsByAuthor returns an error', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('She turned me into a newt!')),
    ) as jest.Mock;

    // set delay to null to prevent test time-out due to useFakeTimers
    const user = userEvent.setup({ delay: null });
    const searchType = 'base' as InputType;

    await act(async () => {
      renderWithRouter(
        <SearchView
          toggleColorMode={toggleColorMode}
          protocolTheme={protocolTheme}
          title={Strings.metaData.pageTitle.search}
        />,
      );
    });

    await screen.findAllByRole('button', { name: 'Base' });
    const searchInput = screen.getAllByRole('textbox')[0];
    await user.type(searchInput, 'grahamchapman@python.com');
    await act(async () => void jest.runOnlyPendingTimers());

    expect(global.fetch).toHaveBeenCalledWith(
      'https://treeherder.mozilla.org/api/project/try/push/?author=grahamchapman@python.com',
    );

    await screen.findAllByText('She turned me into a newt!');
    expect(store.getState().search[searchType].inputError).toBe(true);
    expect(store.getState().search[searchType].inputHelperText).toBe(
      'She turned me into a newt!',
    );
  });

  it('should update error state with generic message if fetch error message is undefined', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error())) as jest.Mock;
    // set delay to null to prevent test time-out due to useFakeTimers
    const user = userEvent.setup({ delay: null });
    const searchType = 'base' as InputType;

    renderWithRouter(
      <SearchView
        toggleColorMode={toggleColorMode}
        protocolTheme={protocolTheme}
        title={Strings.metaData.pageTitle.search}
      />,
    );

    await screen.findAllByRole('button', { name: 'Base' });
    const searchInput = screen.getAllByRole('textbox')[0];
    await user.type(searchInput, 'grahamchapman@python.com');
    await act(async () => void jest.runOnlyPendingTimers());

    expect(global.fetch).toHaveBeenCalledWith(
      'https://treeherder.mozilla.org/api/project/try/push/?author=grahamchapman@python.com',
    );

    await screen.findAllByText('An error has occurred');
    expect(store.getState().search[searchType].searchResults).toStrictEqual([]);
    expect(store.getState().search[searchType].inputError).toBe(true);
    expect(store.getState().search[searchType].inputHelperText).toBe(
      'An error has occurred',
    );
  });
});
