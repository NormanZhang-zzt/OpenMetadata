/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import Icon, { CloseCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  DatePicker,
  Dropdown,
  MenuProps,
  Radio,
  Row,
  Space,
} from 'antd';
import { RangePickerProps } from 'antd/lib/date-picker';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { isNaN, map } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as Calendar } from '../../assets/svg/calendar.svg';
import { ReactComponent as FilterIcon } from '../../assets/svg/filter.svg';
import {
  EXECUTION_FILTER_RANGE,
  MenuOptions,
} from '../../constants/execution.constants';
import { PIPELINE_EXECUTION_TABS } from '../../constants/pipeline.constants';
import { PipelineStatus, Task } from '../../generated/entity/data/pipeline';
import { getPipelineStatus } from '../../rest/pipelineAPI';
import {
  getCurrentMillis,
  getEpochMillisForPastDays,
} from '../../utils/date-time/DateTimeUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import './execution.less';
import ListView from './ListView/ListViewTab.component';
import TreeViewTab from './TreeView/TreeViewTab.component';

interface ExecutionProps {
  pipelineFQN: string;
  tasks: Task[];
}

const ExecutionsTab = ({ pipelineFQN, tasks }: ExecutionProps) => {
  const { t } = useTranslation();
  const [view, setView] = useState(PIPELINE_EXECUTION_TABS.LIST_VIEW);
  const [executions, setExecutions] = useState<Array<PipelineStatus>>();
  const [datesSelected, setDatesSelected] = useState<boolean>(false);
  const [startTime, setStartTime] = useState(
    getEpochMillisForPastDays(EXECUTION_FILTER_RANGE.last365days.days)
  );
  const [endTime, setEndTime] = useState(getCurrentMillis());
  const [isClickedCalendar, setIsClickedCalendar] = useState(false);
  const [status, setStatus] = useState(MenuOptions.all);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPipelineStatus = async (startRange: number, endRange: number) => {
    try {
      setIsLoading(true);

      const response = await getPipelineStatus(pipelineFQN, {
        startTs: startRange,
        endTs: endRange,
      });
      setExecutions(response.data);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.fetch-pipeline-status-error')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuClick: MenuProps['onClick'] = useCallback(
    (event) => setStatus(MenuOptions[event.key as keyof typeof MenuOptions]),
    []
  );

  const statusMenuItems = useMemo(
    () => ({
      items: map(MenuOptions, (value, key) => ({
        key: key,
        label: value,
      })),
      onClick: handleMenuClick,
    }),
    [handleMenuClick]
  );

  const onDateChange: RangePickerProps['onChange'] = (values) => {
    if (values) {
      const startTime = values[0]?.valueOf() ?? 0;
      const endTime = values[1]?.valueOf() ?? 0;

      if (!isNaN(startTime) && !isNaN(endTime)) {
        setStartTime(startTime);
        setEndTime(endTime);
      }
      if (isNaN(startTime)) {
        setIsClickedCalendar(false);
        setStartTime(
          getEpochMillisForPastDays(EXECUTION_FILTER_RANGE.last365days.days)
        );
        setEndTime(getCurrentMillis());

        setDatesSelected(false);
      }

      setDatesSelected(true);
    } else {
      setDatesSelected(false);
      setStartTime(
        getEpochMillisForPastDays(EXECUTION_FILTER_RANGE.last365days.days)
      );
      setEndTime(getCurrentMillis());
    }
  };

  useEffect(() => {
    fetchPipelineStatus(startTime, endTime);
  }, [pipelineFQN, datesSelected, startTime, endTime]);

  return (
    <Row className="h-full p-md" data-testid="execution-tab" gutter={16}>
      <Col flex="auto">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space className="justify-between w-full">
              <Radio.Group
                buttonStyle="solid"
                className="radio-switch"
                data-testid="radio-switch"
                optionType="button"
                options={Object.values(PIPELINE_EXECUTION_TABS)}
                value={view}
                onChange={(e) => setView(e.target.value)}
              />
              <Space>
                <Dropdown menu={statusMenuItems} placement="bottom">
                  <Button
                    ghost
                    data-testid="status-button"
                    icon={<Icon component={FilterIcon} size={12} />}
                    type="primary">
                    {status === MenuOptions.all ? t('label.status') : status}
                  </Button>
                </Dropdown>
                {view === PIPELINE_EXECUTION_TABS.LIST_VIEW ? (
                  <>
                    <Button
                      ghost
                      className={classNames('range-picker-button delay-100', {
                        'range-picker-button-width delay-100':
                          !datesSelected && !isClickedCalendar,
                      })}
                      data-testid="data-range-picker-button"
                      icon={<Icon component={Calendar} size={12} />}
                      type="primary"
                      onClick={() => {
                        setIsClickedCalendar(true);
                      }}>
                      <span>
                        {!datesSelected && (
                          <label>{t('label.date-filter')}</label>
                        )}
                        <DatePicker.RangePicker
                          allowClear
                          showNow
                          bordered={false}
                          className="executions-date-picker"
                          clearIcon={<CloseCircleOutlined />}
                          data-testid="data-range-picker"
                          open={isClickedCalendar}
                          placeholder={['', '']}
                          suffixIcon={null}
                          onChange={onDateChange}
                          onOpenChange={(isOpen) => {
                            setIsClickedCalendar(isOpen);
                          }}
                        />
                      </span>
                    </Button>
                  </>
                ) : null}
              </Space>
            </Space>
          </Col>
          <Col span={24}>
            {view === PIPELINE_EXECUTION_TABS.LIST_VIEW ? (
              <ListView
                executions={executions}
                loading={isLoading}
                status={status}
              />
            ) : (
              <TreeViewTab
                endTime={endTime}
                executions={executions}
                startTime={startTime}
                status={status}
                tasks={tasks}
              />
            )}
          </Col>
        </Row>
      </Col>
    </Row>
  );
};

export default ExecutionsTab;
