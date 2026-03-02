import { Children, cloneElement, Fragment, isValidElement } from 'react';
import type { PropsWithChildren, ReactElement, ReactNode } from 'react';

import { cn } from '@/utils/cn';
import { Hr } from '@/components/Hr';

type StepProps = PropsWithChildren<{
  stepNumber?: number;
  title: ReactNode;
  description: ReactNode;
  asideElement?: ReactNode;
}>;

type StepElement = ReactElement<StepProps, typeof Step>;

const StepWrapper = ({ children }: PropsWithChildren) => {
  return <div className="flex flex-col gap-y-sw-xl">{children}</div>;
};

const Step = ({
  title,
  description,
  stepNumber,
  asideElement,
  children,
}: StepProps) => {
  const Wrapper = children ? StepWrapper : Fragment;

  return (
    <Wrapper>
      <div className="flex items-center justify-between py-sw-md">
        <span className="flex items-center justify-center gap-y-sw-lg h-[28px] w-[28px] rounded-full bg-sw-gray-50 text-sw-gray-950 text-sw-label-sm">
          {stepNumber}
        </span>
        <div className="flex flex-col gap-sw-xs mr-auto ml-sw-lg">
          <span className="text-sw-label-md text-sw-gray-50">{title}</span>
          <span className="text-sw-label-sm text-sw-gray-200">
            {description}
          </span>
        </div>

        {asideElement}
      </div>
      {children}
    </Wrapper>
  );
};

type Props = {
  className?: string;
  children: StepElement | StepElement[];
};

const StepsBase = ({ className, children }: Props) => {
  const normalizedChildren = Children.toArray(children);

  return (
    <section className={cn('flex flex-col gap-sw-sm', className)}>
      {Children.map(normalizedChildren, (child, index) => (
        <>
          <Hr />
          {isValidElement<StepProps>(child)
            ? cloneElement(child, {
                stepNumber: child.props.stepNumber ?? index + 1,
              })
            : child}
        </>
      ))}
    </section>
  );
};

export const Steps = Object.assign(StepsBase, { Step });
